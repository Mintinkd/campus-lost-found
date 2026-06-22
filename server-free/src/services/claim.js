const { Claim, Item, User } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('./notification');
const { getDecryptedMaskedPhone } = require('../utils/crypto');

const MAX_DAILY_CLAIMS = 5;
const CLAIM_EXPIRY_HOURS = 48;

async function createClaim(claimerId, itemId, claimReason) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayClaims = await Claim.count({ where: { claimerId, createdAt: { [Op.gte]: today } } });
  if (todayClaims >= MAX_DAILY_CLAIMS) return { error: '操作频繁，请明日再试', code: 4001 };

  const item = await Item.findByPk(itemId);
  if (!item) return { error: '物品不存在', code: 4002 };
  if (item.status === 'returned' || item.status === 'expired') return { error: '该物品无法认领', code: 4003 };

  const existingClaim = await Claim.findOne({ where: { itemId, claimerId, status: { [Op.in]: ['pending', 'confirmed', 'returning'] } } });
  if (existingClaim) return { error: '您已对该物品发起过认领', code: 4004 };

  const activeClaim = await Claim.findOne({ where: { itemId, status: { [Op.in]: ['pending', 'confirmed'] } } });
  if (activeClaim) return { error: '该物品正在认领中，请稍后重试', code: 4005 };

  const claim = await Claim.create({ itemId, claimerId, claimReason, status: 'pending' });
  await item.update({ status: 'claiming' });

  setImmediate(() => {
    notificationService.sendClaimNotification(item.finderId, claim.id, item.category)
      .catch(err => console.error('认领通知异常:', err.message));
  });

  return claim;
}

async function confirmClaim(claimId, finderId) {
  const claim = await Claim.findByPk(claimId, { include: [{ model: Item, as: 'item' }] });
  if (!claim) return { error: '认领记录不存在', code: 4006 };
  if (claim.item.finderId !== finderId) return { error: '无权操作', code: 4007 };
  if (claim.status !== 'pending') return { error: '认领状态不正确', code: 4008 };

  await claim.update({ status: 'confirmed', confirmedAt: new Date() });
  setImmediate(() => {
    notificationService.sendClaimConfirmedNotification(claim.claimerId, claim.id)
      .catch(err => console.error('确认通知异常:', err.message));
  });
  return claim;
}

async function rejectClaim(claimId, finderId) {
  const claim = await Claim.findByPk(claimId, { include: [{ model: Item, as: 'item' }] });
  if (!claim) return { error: '认领记录不存在', code: 4006 };
  if (claim.item.finderId !== finderId) return { error: '无权操作', code: 4007 };
  if (claim.status !== 'pending') return { error: '认领状态不正确', code: 4008 };

  await claim.update({ status: 'rejected' });
  const otherPending = await Claim.count({ where: { itemId: claim.itemId, status: 'pending' } });
  if (otherPending === 0) await Item.update({ status: 'pending' }, { where: { id: claim.itemId } });
  return claim;
}

async function confirmReturn(claimId, finderId) {
  const claim = await Claim.findByPk(claimId, { include: [{ model: Item, as: 'item' }] });
  if (!claim) return { error: '认领记录不存在', code: 4006 };
  if (claim.item.finderId !== finderId) return { error: '无权操作', code: 4007 };
  if (claim.status !== 'confirmed' && claim.status !== 'returning') return { error: '认领状态不正确', code: 4008 };

  await claim.update({ status: 'completed', returnedAt: new Date() });
  await Item.update({ status: 'returned' }, { where: { id: claim.itemId } });

  setImmediate(() => {
    notificationService.sendReturnConfirmedNotification(claim.claimerId, claim.id)
      .catch(err => console.error('归还通知异常:', err.message));
  });
  return claim;
}

async function getClaimContact(claimId, userId) {
  const claim = await Claim.findByPk(claimId, {
    include: [
      { model: Item, as: 'item', include: [{ model: User, as: 'finder' }] },
      { model: User, as: 'claimer' }
    ]
  });

  if (!claim) return { error: '认领记录不存在', code: 4006 };
  const isFinder = claim.item.finderId === userId;
  const isClaimer = claim.claimerId === userId;
  if (!isFinder && !isClaimer) return { error: '无权查看', code: 4009 };
  if (claim.status !== 'confirmed' && claim.status !== 'returning') return { error: '认领尚未确认', code: 4010 };

  if (isFinder) {
    const phone = claim.claimer.phoneEncrypted;
    return { nickname: claim.claimer.nickname, avatarUrl: claim.claimer.avatarUrl, phone: phone ? getDecryptedMaskedPhone(phone) : null };
  } else {
    const phone = claim.item.finder.phoneEncrypted;
    return { nickname: claim.item.finder.nickname, avatarUrl: claim.item.finder.avatarUrl, phone: phone ? getDecryptedMaskedPhone(phone) : null };
  }
}

async function getClaims(userId, type = 'my_claims', page = 1, pageSize = 20) {
  const whereClause = {};
  if (type === 'my_claims') {
    whereClause.claimerId = userId;
  } else if (type === 'received_claims') {
    const myItems = await Item.findAll({ where: { finderId: userId }, attributes: ['id'] });
    whereClause.itemId = { [Op.in]: myItems.map(i => i.id) };
  }

  const { count, rows } = await Claim.findAndCountAll({
    where: whereClause,
    include: [
      { model: Item, as: 'item', attributes: ['id', 'category', 'location', 'photos', 'status'] },
      { model: User, as: 'claimer', attributes: ['id', 'nickname', 'avatarUrl'] }
    ],
    order: [['created_at', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize
  });
  return { total: count, page, pageSize, list: rows };
}

async function expireOldClaims() {
  const expiryTime = new Date(Date.now() - CLAIM_EXPIRY_HOURS * 60 * 60 * 1000);
  const expiredClaims = await Claim.findAll({ where: { status: 'pending', createdAt: { [Op.lt]: expiryTime } } });
  for (const claim of expiredClaims) {
    await claim.update({ status: 'expired' });
    const otherPending = await Claim.count({ where: { itemId: claim.itemId, status: 'pending' } });
    if (otherPending === 0) await Item.update({ status: 'pending' }, { where: { id: claim.itemId } });
  }
  return expiredClaims.length;
}

module.exports = { createClaim, confirmClaim, rejectClaim, confirmReturn, getClaimContact, getClaims, expireOldClaims };
const { Item, Claim, User } = require('../models');
const { Op } = require('sequelize');
const imageRecognition = require('./imageRecognition');
const matchingService = require('./matching');
const notificationService = require('./notification');

async function createItem(finderId, itemData) {
  const item = await Item.create({
    finderId,
    category: itemData.category,
    confidence: itemData.confidence,
    description: itemData.description,
    location: itemData.location,
    foundTime: itemData.foundTime,
    photos: itemData.photos || [],
    status: 'pending'
  });

  setImmediate(() => {
    matchingService.checkAndNotifyMatch(item).catch(err =>
      console.error('匹配通知异常:', err.message)
    );
  });

  return item;
}

async function recognizeAndCreate(finderId, imageBase64, itemData) {
  const recognition = await imageRecognition.recognizeImage(imageBase64);

  if (recognition.isForbidden) {
    return { error: '违禁物品，禁止上报', code: 2001 };
  }

  const category = recognition.success && !recognition.fallback
    ? recognition.category
    : itemData.category || '其他';

  const confidence = recognition.success && !recognition.fallback
    ? recognition.confidence
    : null;

  const item = await createItem(finderId, {
    ...itemData, category, confidence,
    needsConfirm: recognition.needsConfirm
  });

  return {
    item,
    recognition: recognition.success ? {
      category: recognition.category,
      confidence: recognition.confidence,
      needsConfirm: recognition.needsConfirm,
      allTags: recognition.allTags
    } : null,
    fallback: recognition.fallback || false
  };
}

async function getItems({ page = 1, pageSize = 20, category, location, status, keyword }) {
  const whereClause = {};
  if (category) whereClause.category = category;
  if (location) whereClause.location = { [Op.like]: `%${location}%` };
  if (status) whereClause.status = status;
  if (keyword) {
    whereClause[Op.or] = [
      { description: { [Op.like]: `%${keyword}%` } },
      { category: { [Op.like]: `%${keyword}%` } },
      { location: { [Op.like]: `%${keyword}%` } }
    ];
  }

  const { count, rows } = await Item.findAndCountAll({
    where: whereClause,
    include: [{ model: User, as: 'finder', attributes: ['id', 'nickname', 'avatarUrl'] }],
    order: [['foundTime', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return { total: count, page, pageSize, list: rows };
}

async function getItemById(id) {
  const item = await Item.findByPk(id, {
    include: [
      { model: User, as: 'finder', attributes: ['id', 'nickname', 'avatarUrl'] },
      { model: Claim, as: 'claims' }
    ]
  });
  return item;
}

async function updateItem(id, finderId, data) {
  const item = await Item.findOne({ where: { id, finderId } });
  if (!item) return null;
  const updateData = {};
  if (data.category) updateData.category = data.category;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.location) updateData.location = data.location;
  if (data.foundTime) updateData.foundTime = data.foundTime;
  if (data.photos) updateData.photos = data.photos;
  await item.update(updateData);
  return item;
}

async function deleteItem(id, finderId) {
  const item = await Item.findOne({ where: { id, finderId } });
  if (!item) return false;
  if (item.status === 'claiming') return { error: '物品正在认领中，无法删除', code: 2002 };
  await item.destroy();
  return true;
}

async function getMyItems(finderId, page = 1, pageSize = 20) {
  const { count, rows } = await Item.findAndCountAll({
    where: { finderId },
    include: [{ model: Claim, as: 'claims' }],
    order: [['created_at', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize
  });
  return { total: count, page, pageSize, list: rows };
}

async function expireOldItems() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [updated] = await Item.update(
    { status: 'expired' },
    { where: { status: 'pending', foundTime: { [Op.lt]: thirtyDaysAgo } } }
  );
  return updated;
}

module.exports = {
  createItem, recognizeAndCreate, getItems, getItemById,
  updateItem, deleteItem, getMyItems, expireOldItems
};
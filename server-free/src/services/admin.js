const { Item, User, Claim, AdminLog, Role } = require('../models');
const { Op } = require('sequelize');

async function listAllItems({ page = 1, pageSize = 20, category, status, keyword, includeDeleted }) {
  const whereClause = {};
  if (category) whereClause.category = category;
  if (status) whereClause.status = status;
  if (!includeDeleted) whereClause.deletedAt = null;
  if (keyword) {
    whereClause[Op.or] = [
      { description: { [Op.iLike]: '%' + keyword + '%' } },
      { location: { [Op.iLike]: '%' + keyword + '%' } }
    ];
  }

  const { count, rows } = await Item.findAndCountAll({
    where: whereClause,
    include: [{ model: User, as: 'finder', attributes: ['id', 'nickname', 'email'] }],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return { total: count, page, pageSize, list: rows };
}

async function softDeleteItem(itemId, adminId) {
  const item = await Item.findByPk(itemId);
  if (!item) return { error: '物品不存在', code: 4001 };
  if (item.deletedAt) return { error: '物品已被删除', code: 4002 };

  await item.update({ deletedAt: new Date(), status: 'hidden' });
  await AdminLog.create({ adminId, action: 'soft_delete', targetType: 'item', targetId: itemId });
  return item;
}

async function hardDeleteItem(itemId, adminId) {
  const item = await Item.findByPk(itemId);
  if (!item) return { error: '物品不存在', code: 4001 };

  await Claim.destroy({ where: { itemId } });
  await item.destroy({ force: true });
  await AdminLog.create({ adminId, action: 'hard_delete', targetType: 'item', targetId: itemId });
  return { success: true };
}

async function restoreItem(itemId, adminId) {
  const item = await Item.findByPk(itemId, { paranoid: false });
  if (!item) return { error: '物品不存在', code: 4001 };
  if (!item.deletedAt) return { error: '物品未被删除', code: 4002 };

  await item.update({ deletedAt: null, status: 'pending' });
  await AdminLog.create({ adminId, action: 'restore', targetType: 'item', targetId: itemId });
  return item;
}

async function hideItem(itemId, adminId) {
  const item = await Item.findByPk(itemId);
  if (!item) return { error: '物品不存在', code: 4001 };

  await item.update({ status: 'hidden' });
  await AdminLog.create({ adminId, action: 'hide', targetType: 'item', targetId: itemId });
  return item;
}

async function approveItem(itemId, adminId) {
  const item = await Item.findByPk(itemId);
  if (!item) return { error: '物品不存在', code: 4001 };

  await item.update({ status: 'pending' });
  await AdminLog.create({ adminId, action: 'approve', targetType: 'item', targetId: itemId });
  return item;
}

async function listAllUsers({ page = 1, pageSize = 20, keyword, isBanned }) {
  const whereClause = {};
  if (isBanned !== undefined) whereClause.isBanned = isBanned === 'true';
  if (keyword) {
    whereClause[Op.or] = [
      { nickname: { [Op.iLike]: '%' + keyword + '%' } },
      { email: { [Op.iLike]: '%' + keyword + '%' } }
    ];
  }

  const { count, rows } = await User.findAndCountAll({
    where: whereClause,
    attributes: ['id', 'nickname', 'email', 'roleId', 'isBanned', 'createdAt'],
    include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return { total: count, page, pageSize, list: rows };
}

async function banUser(userId, adminId) {
  const user = await User.findByPk(userId);
  if (!user) return { error: '用户不存在', code: 4001 };
  if (user.isBanned) return { error: '用户已被封禁', code: 4002 };

  await user.update({ isBanned: true });
  await AdminLog.create({ adminId, action: 'ban', targetType: 'user', targetId: userId });
  return user;
}

async function unbanUser(userId, adminId) {
  const user = await User.findByPk(userId);
  if (!user) return { error: '用户不存在', code: 4001 };

  await user.update({ isBanned: false });
  await AdminLog.create({ adminId, action: 'unban', targetType: 'user', targetId: userId });
  return user;
}

async function assignRole(userId, roleId, adminId) {
  const user = await User.findByPk(userId);
  if (!user) return { error: '用户不存在', code: 4001 };
  const role = await Role.findByPk(roleId);
  if (!role) return { error: '角色不存在', code: 4002 };

  await user.update({ roleId });
  await AdminLog.create({ adminId, action: 'assign_role', targetType: 'user', targetId: userId, detail: JSON.stringify({ roleId, roleName: role.name }) });
  return user;
}

async function listRoles() {
  return Role.findAll({ order: [['createdAt', 'ASC']] });
}

async function createRole(name, permissions) {
  const existing = await Role.findOne({ where: { name } });
  if (existing) return { error: '角色名已存在', code: 4001 };
  return Role.create({ name, permissions });
}

async function updateRole(roleId, name, permissions) {
  const role = await Role.findByPk(roleId);
  if (!role) return { error: '角色不存在', code: 4001 };
  if (role.name === 'super_admin') return { error: '超级管理员角色不可修改', code: 4002 };
  await role.update({ name: name || role.name, permissions: permissions || role.permissions });
  return role;
}

async function deleteRole(roleId) {
  const role = await Role.findByPk(roleId);
  if (!role) return { error: '角色不存在', code: 4001 };
  if (role.name === 'super_admin') return { error: '超级管理员角色不可删除', code: 4002 };
  const usersWithRole = await User.count({ where: { roleId } });
  if (usersWithRole > 0) return { error: '该角色下还有用户，无法删除', code: 4003 };
  await role.destroy();
  return { success: true };
}

async function getAdminLogs({ page = 1, pageSize = 20, adminId, action }) {
  const whereClause = {};
  if (adminId) whereClause.adminId = adminId;
  if (action) whereClause.action = action;

  const { count, rows } = await AdminLog.findAndCountAll({
    where: whereClause,
    include: [{ model: User, as: 'admin', attributes: ['id', 'nickname', 'email'] }],
    order: [['createdAt', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return { total: count, page, pageSize, list: rows };
}

async function getDashboardStats() {
  const totalUsers = await User.count();
  const totalItems = await Item.count({ where: { deletedAt: null } });
  const pendingItems = await Item.count({ where: { status: 'pending', deletedAt: null } });
  const hiddenItems = await Item.count({ where: { status: 'hidden' } });
  const deletedItems = await Item.count({ where: { deletedAt: { [Op.ne]: null } } });
  const bannedUsers = await User.count({ where: { isBanned: true } });
  const totalClaims = await Claim.count();

  return { totalUsers, totalItems, pendingItems, hiddenItems, deletedItems, bannedUsers, totalClaims };
}

module.exports = {
  listAllItems, softDeleteItem, hardDeleteItem, restoreItem, hideItem, approveItem,
  listAllUsers, banUser, unbanUser, assignRole,
  listRoles, createRole, updateRole, deleteRole,
  getAdminLogs, getDashboardStats
};
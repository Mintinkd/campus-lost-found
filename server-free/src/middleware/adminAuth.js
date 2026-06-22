const { User, Role } = require('../models');
const jwt = require('jsonwebtoken');
const config = require('../config');

const PERMISSIONS = {
  CONTENT_VIEW: 'content:view',
  CONTENT_DELETE: 'content:delete',
  CONTENT_HIDE: 'content:hide',
  USER_VIEW: 'user:view',
  USER_BAN: 'user:ban',
  ROLE_MANAGE: 'role:manage',
  ADMIN_LOG: 'admin:log'
};

exports.PERMISSIONS = PERMISSIONS;

exports.adminAuth = (requiredPermission) => {
  return async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ code: 1001, message: '未提供认证Token', data: null });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      return res.status(401).json({ code: 1002, message: 'Token无效或已过期', data: null });
    }

    try {
      const user = await User.findByPk(decoded.userId, {
        include: [{ model: Role, as: 'role' }]
      });

      if (!user) {
        return res.status(401).json({ code: 1002, message: '用户不存在', data: null });
      }

      if (user.isBanned) {
        return res.status(403).json({ code: 4003, message: '账号已被封禁', data: null });
      }

      if (!user.roleId || !user.role) {
        return res.status(403).json({ code: 4003, message: '无管理员权限', data: null });
      }

      const permissions = user.role.permissions || [];
      if (requiredPermission && !permissions.includes(requiredPermission)) {
        return res.status(403).json({ code: 4003, message: '权限不足: ' + requiredPermission, data: null });
      }

      req.userId = decoded.userId;
      req.user = user;
      req.permissions = permissions;
      next();
    } catch (err) {
      return res.status(500).json({ code: 9999, message: '权限校验异常', data: null });
    }
  };
};

exports.ensureSuperAdmin = async (userId) => {
  const user = await User.findByPk(userId, { include: [{ model: Role, as: 'role' }] });
  if (!user || !user.role) return false;
  return user.role.name === 'super_admin';
};
const jwt = require('jsonwebtoken');
const config = require('../config');

exports.auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ code: 1001, message: '未提供认证Token', data: null });
  }
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.userId = decoded.userId;
    req.openid = decoded.openid;
    next();
  } catch (err) {
    return res.status(401).json({ code: 1002, message: 'Token无效或已过期', data: null });
  }
};

exports.optional = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      req.userId = decoded.userId;
      req.openid = decoded.openid;
    } catch (err) { /* ignore */ }
  }
  next();
};
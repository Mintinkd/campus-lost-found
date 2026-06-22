const { Claim } = require('../models');
const { Op } = require('sequelize');

const claimCounts = new Map();

exports.rateLimitClaims = (req, res, next) => {
  const userId = req.userId;
  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000;
  const maxClaims = 5;

  const record = claimCounts.get(userId) || { count: 0, windowStart: now };

  if (now - record.windowStart > windowMs) {
    record.count = 0;
    record.windowStart = now;
  }

  record.count++;
  claimCounts.set(userId, record);

  if (record.count > maxClaims) {
    return res.status(429).json({
      code: 4001,
      message: '操作频繁，请明日再试',
      data: null
    });
  }

  next();
};
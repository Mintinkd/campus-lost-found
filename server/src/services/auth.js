const jwt = require('jsonwebtoken');
const axios = require('axios');
const config = require('../config');
const { User } = require('../models');
const { encrypt, getDecryptedMaskedPhone } = require('../utils/crypto');

async function wxLogin(code) {
  const url = 'https://api.weixin.qq.com/sns/jscode2session';
  const response = await axios.get(url, {
    params: {
      appid: config.wechat.appId,
      secret: config.wechat.appSecret,
      js_code: code,
      grant_type: 'authorization_code'
    }
  });

  const { openid, session_key } = response.data;
  if (!openid) {
    throw new Error('微信登录失败: ' + (response.data.errmsg || '未知错误'));
  }

  let user = await User.findOne({ where: { openid } });
  if (!user) {
    user = await User.create({
      openid,
      nickname: '微信用户',
      avatarUrl: ''
    });
  }

  const token = jwt.sign(
    { userId: user.id, openid: user.openid },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return { token, user: user.toJSON() };
}

async function getProfile(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  const profile = user.toJSON();
  profile.phoneMasked = getDecryptedMaskedPhone(profile.phoneEncrypted);
  delete profile.phoneEncrypted;
  return profile;
}

async function updateProfile(userId, data) {
  const user = await User.findByPk(userId);
  if (!user) return null;

  const updateData = {};
  if (data.nickname) updateData.nickname = data.nickname;
  if (data.avatarUrl) updateData.avatarUrl = data.avatarUrl;
  if (data.campus) updateData.campus = data.campus;
  if (data.phone) updateData.phoneEncrypted = encrypt(data.phone);

  await user.update(updateData);
  return getProfile(userId);
}

module.exports = { wxLogin, getProfile, updateProfile };
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config');
const { encrypt, getDecryptedMaskedPhone } = require('../utils/crypto');

async function localRegister(email, password, nickname) {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    return { error: '邮箱已注册', code: 1001 };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    openid: `local_${email}`,
    nickname: nickname || email.split('@')[0],
    avatarUrl: '',
    email,
    password: hashedPassword
  });

  const token = jwt.sign(
    { userId: user.id, openid: user.openid },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return { token, user: user.toJSON() };
}

async function localLogin(email, password) {
  const user = await User.findOne({ where: { email } });
  if (!user || !user.password) {
    return { error: '邮箱或密码错误', code: 1002 };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return { error: '邮箱或密码错误', code: 1002 };
  }

  const token = jwt.sign(
    { userId: user.id, openid: user.openid },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return { token, user: user.toJSON() };
}

async function wxLogin(code) {
  const axios = require('axios');
  const url = 'https://api.weixin.qq.com/sns/jscode2session';
  const response = await axios.get(url, {
    params: {
      appid: config.auth.wechat.appId,
      secret: config.auth.wechat.appSecret,
      js_code: code,
      grant_type: 'authorization_code'
    }
  });

  const { openid } = response.data;
  if (!openid) {
    throw new Error('微信登录失败: ' + (response.data.errmsg || '未知错误'));
  }

  let user = await User.findOne({ where: { openid } });
  if (!user) {
    user = await User.create({ openid, nickname: '微信用户', avatarUrl: '' });
  }

  const token = jwt.sign(
    { userId: user.id, openid: user.openid },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

  return { token, user: user.toJSON() };
}

async function login(provider, data) {
  if (provider === 'wechat') {
    return wxLogin(data.code);
  }
  return localLogin(data.email, data.password);
}

async function getProfile(userId) {
  const user = await User.findByPk(userId);
  if (!user) return null;
  const profile = user.toJSON();
  profile.phoneMasked = getDecryptedMaskedPhone(profile.phoneEncrypted);
  delete profile.phoneEncrypted;
  delete profile.password;
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
  if (data.email) updateData.email = data.email;
  if (data.password) updateData.password = await bcrypt.hash(data.password, 10);

  await user.update(updateData);
  return getProfile(userId);
}

module.exports = { localRegister, localLogin, wxLogin, login, getProfile, updateProfile };
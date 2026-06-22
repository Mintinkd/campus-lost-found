const authService = require('../services/auth');
const config = require('../config');

exports.register = async (req, res) => {
  try {
    const { email, password, nickname } = req.body;
    if (!email || !password) return res.error(1001, '邮箱和密码为必填项');
    if (password.length < 6) return res.error(1001, '密码至少6位');

    const result = await authService.localRegister(email, password, nickname);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(1002, err.message);
  }
};

exports.login = async (req, res) => {
  try {
    const provider = config.auth.provider;
    const data = req.body;

    if (provider === 'wechat') {
      if (!data.code) return res.error(1001, '缺少微信登录code');
      const result = await authService.wxLogin(data.code);
      return res.success(result);
    }

    if (!data.email || !data.password) return res.error(1001, '邮箱和密码为必填项');
    const result = await authService.localLogin(data.email, data.password);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(1002, err.message);
  }
};

exports.getProfile = async (req, res) => {
  try {
    const profile = await authService.getProfile(req.userId);
    if (!profile) return res.error(1003, '用户不存在');
    res.success(profile);
  } catch (err) {
    res.error(1004, err.message);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const profile = await authService.updateProfile(req.userId, req.body);
    if (!profile) return res.error(1003, '用户不存在');
    res.success(profile);
  } catch (err) {
    res.error(1005, err.message);
  }
};
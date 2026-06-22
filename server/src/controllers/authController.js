const authService = require('../services/auth');

exports.login = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.error(1001, '缺少微信登录code');

    const result = await authService.wxLogin(code);
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
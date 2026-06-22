const claimService = require('../services/claim');

exports.createClaim = async (req, res) => {
  try {
    const { itemId, claimReason } = req.body;
    if (!itemId) return res.error(4001, '缺少物品ID');
    if (!claimReason || !claimReason.trim()) return res.error(4002, '请填写认领说明以验证身份');
    const result = await claimService.createClaim(req.userId, itemId, claimReason.trim());
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(4003, err.message);
  }
};

exports.getClaims = async (req, res) => {
  try {
    const { type = 'my_claims', page, pageSize } = req.query;
    const result = await claimService.getClaims(req.userId, type, parseInt(page) || 1, parseInt(pageSize) || 20);
    res.success(result);
  } catch (err) {
    res.error(4004, err.message);
  }
};

exports.confirmClaim = async (req, res) => {
  try {
    const result = await claimService.confirmClaim(req.params.id, req.userId);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(4005, err.message);
  }
};

exports.rejectClaim = async (req, res) => {
  try {
    const result = await claimService.rejectClaim(req.params.id, req.userId);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(4006, err.message);
  }
};

exports.confirmReturn = async (req, res) => {
  try {
    const result = await claimService.confirmReturn(req.params.id, req.userId);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(4007, err.message);
  }
};

exports.getClaimContact = async (req, res) => {
  try {
    const result = await claimService.getClaimContact(req.params.id, req.userId);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(4008, err.message);
  }
};
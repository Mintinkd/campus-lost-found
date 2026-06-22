const adminService = require('../services/admin');
const { PERMISSIONS } = require('../middleware/adminAuth');

exports.getDashboard = async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.success(stats);
  } catch (err) {
    res.error(5001, err.message);
  }
};

exports.listItems = async (req, res) => {
  try {
    const { page, pageSize, category, status, keyword, includeDeleted } = req.query;
    const result = await adminService.listAllItems({
      page: parseInt(page) || 1, pageSize: parseInt(pageSize) || 20,
      category, status, keyword, includeDeleted: includeDeleted === 'true'
    });
    res.success(result);
  } catch (err) {
    res.error(5002, err.message);
  }
};

exports.softDeleteItem = async (req, res) => {
  try {
    const result = await adminService.softDeleteItem(req.params.id, req.userId);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(5003, err.message);
  }
};

exports.hardDeleteItem = async (req, res) => {
  try {
    const result = await adminService.hardDeleteItem(req.params.id, req.userId);
    if (result.error) return res.error(result.code, result.error);
    res.success(null, '永久删除成功');
  } catch (err) {
    res.error(5004, err.message);
  }
};

exports.restoreItem = async (req, res) => {
  try {
    const result = await adminService.restoreItem(req.params.id, req.userId);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(5005, err.message);
  }
};

exports.hideItem = async (req, res) => {
  try {
    const result = await adminService.hideItem(req.params.id, req.userId);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(5006, err.message);
  }
};

exports.approveItem = async (req, res) => {
  try {
    const result = await adminService.approveItem(req.params.id, req.userId);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(5007, err.message);
  }
};

exports.listUsers = async (req, res) => {
  try {
    const { page, pageSize, keyword, isBanned } = req.query;
    const result = await adminService.listAllUsers({
      page: parseInt(page) || 1, pageSize: parseInt(pageSize) || 20,
      keyword, isBanned
    });
    res.success(result);
  } catch (err) {
    res.error(5008, err.message);
  }
};

exports.banUser = async (req, res) => {
  try {
    const result = await adminService.banUser(req.params.id, req.userId);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(5009, err.message);
  }
};

exports.unbanUser = async (req, res) => {
  try {
    const result = await adminService.unbanUser(req.params.id, req.userId);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(5010, err.message);
  }
};

exports.assignRole = async (req, res) => {
  try {
    const { roleId } = req.body;
    const result = await adminService.assignRole(req.params.id, roleId, req.userId);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(5011, err.message);
  }
};

exports.listRoles = async (req, res) => {
  try {
    const roles = await adminService.listRoles();
    res.success(roles);
  } catch (err) {
    res.error(5012, err.message);
  }
};

exports.createRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;
    if (!name) return res.error(5013, '角色名不能为空');
    const result = await adminService.createRole(name, permissions || []);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(5014, err.message);
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const result = await adminService.updateRole(req.params.id, name, permissions);
    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(5015, err.message);
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const result = await adminService.deleteRole(req.params.id);
    if (result.error) return res.error(result.code, result.error);
    res.success(null, '角色已删除');
  } catch (err) {
    res.error(5016, err.message);
  }
};

exports.getLogs = async (req, res) => {
  try {
    const { page, pageSize, adminId, action } = req.query;
    const result = await adminService.getAdminLogs({
      page: parseInt(page) || 1, pageSize: parseInt(pageSize) || 20,
      adminId, action
    });
    res.success(result);
  } catch (err) {
    res.error(5017, err.message);
  }
};
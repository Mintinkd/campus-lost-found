const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/adminController');
const { adminAuth, PERMISSIONS } = require('../middleware/adminAuth');

router.get('/dashboard', adminAuth(), adminCtrl.getDashboard);

router.get('/items', adminAuth(PERMISSIONS.CONTENT_VIEW), adminCtrl.listItems);
router.put('/items/:id/hide', adminAuth(PERMISSIONS.CONTENT_HIDE), adminCtrl.hideItem);
router.put('/items/:id/approve', adminAuth(PERMISSIONS.CONTENT_HIDE), adminCtrl.approveItem);
router.delete('/items/:id/soft', adminAuth(PERMISSIONS.CONTENT_DELETE), adminCtrl.softDeleteItem);
router.delete('/items/:id/hard', adminAuth(PERMISSIONS.CONTENT_DELETE), adminCtrl.hardDeleteItem);
router.put('/items/:id/restore', adminAuth(PERMISSIONS.CONTENT_DELETE), adminCtrl.restoreItem);

router.get('/users', adminAuth(PERMISSIONS.USER_VIEW), adminCtrl.listUsers);
router.put('/users/:id/ban', adminAuth(PERMISSIONS.USER_BAN), adminCtrl.banUser);
router.put('/users/:id/unban', adminAuth(PERMISSIONS.USER_BAN), adminCtrl.unbanUser);
router.put('/users/:id/role', adminAuth(PERMISSIONS.ROLE_MANAGE), adminCtrl.assignRole);

router.get('/roles', adminAuth(PERMISSIONS.ROLE_MANAGE), adminCtrl.listRoles);
router.post('/roles', adminAuth(PERMISSIONS.ROLE_MANAGE), adminCtrl.createRole);
router.put('/roles/:id', adminAuth(PERMISSIONS.ROLE_MANAGE), adminCtrl.updateRole);
router.delete('/roles/:id', adminAuth(PERMISSIONS.ROLE_MANAGE), adminCtrl.deleteRole);

router.get('/logs', adminAuth(PERMISSIONS.ADMIN_LOG), adminCtrl.getLogs);

module.exports = router;
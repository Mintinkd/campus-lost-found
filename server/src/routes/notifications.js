const express = require('express');
const router = express.Router();

const notifCtrl = require('../controllers/notificationController');
const { auth } = require('../middleware/auth');

router.get('/', auth, notifCtrl.getNotifications);
router.put('/:id/read', auth, notifCtrl.markAsRead);
router.put('/read-all', auth, notifCtrl.markAllAsRead);

module.exports = router;
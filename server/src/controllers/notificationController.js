const notificationService = require('../services/notification');

exports.getNotifications = async (req, res) => {
  try {
    const { page, pageSize } = req.query;
    const result = await notificationService.getUserNotifications(
      req.userId,
      parseInt(page) || 1,
      parseInt(pageSize) || 20
    );
    res.success(result);
  } catch (err) {
    res.error(5001, err.message);
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const result = await notificationService.markAsRead(req.params.id, req.userId);
    if (!result) return res.error(5002, '通知不存在');
    res.success(result);
  } catch (err) {
    res.error(5003, err.message);
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.userId);
    res.success(null, '全部已读');
  } catch (err) {
    res.error(5004, err.message);
  }
};
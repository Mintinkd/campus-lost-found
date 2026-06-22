const { Notification, User } = require('../models');
const config = require('../config');

async function sendMatchNotification(userId, item, matchScore) {
  const notification = await Notification.create({
    userId,
    type: 'match_found',
    title: '发现匹配物品',
    content: {
      itemId: item.id,
      category: item.category,
      location: item.location,
      foundTime: item.foundTime,
      matchScore: Math.round(matchScore * 100),
      photo: item.photos && item.photos.length > 0 ? item.photos[0] : null
    },
    status: 'pending'
  });

  await pushToSMN(userId, notification);
  return notification;
}

async function sendClaimNotification(userId, claimId, itemName) {
  const notification = await Notification.create({
    userId,
    type: 'claim_request',
    title: '收到认领申请',
    content: {
      claimId,
      itemName
    },
    status: 'pending'
  });

  await pushToSMN(userId, notification);
  return notification;
}

async function sendClaimConfirmedNotification(userId, claimId) {
  const notification = await Notification.create({
    userId,
    type: 'claim_confirmed',
    title: '认领已确认',
    content: { claimId },
    status: 'pending'
  });

  await pushToSMN(userId, notification);
  return notification;
}

async function sendReturnConfirmedNotification(userId, claimId) {
  const notification = await Notification.create({
    userId,
    type: 'return_confirmed',
    title: '物品已归还',
    content: { claimId },
    status: 'pending'
  });

  await pushToSMN(userId, notification);
  return notification;
}

async function pushToSMN(userId, notification) {
  try {
    if (!config.smn.topicUrn || !config.hwCloud.ak) {
      console.log('SMN未配置，通知仅存库:', notification.id);
      await notification.update({ status: 'sent' });
      return;
    }

    const { SmnClient } = require('@huaweicloud/huaweicloud-sdk-smn');
    const client = SmnClient.newBuilder()
      .withAk(config.hwCloud.ak)
      .withSk(config.hwCloud.sk)
      .withRegion(config.hwCloud.region)
      .withProjectId(config.hwCloud.projectId)
      .build();

    const request = new SmnClient.PublishMessageRequest();
    request.topicUrn = config.smn.topicUrn;
    request.body = {
      subject: notification.title,
      message: JSON.stringify({
        type: notification.type,
        content: notification.content,
        notificationId: notification.id
      }),
      message_structure: 'json'
    };

    await client.publishMessage(request);
    await notification.update({ status: 'sent' });
  } catch (error) {
    console.error('SMN推送失败:', error.message);
    const retryCount = notification.retryCount + 1;
    if (retryCount <= 3) {
      await notification.update({ retryCount, status: 'pending' });
      setTimeout(() => retryPush(notification.id), 5000);
    } else {
      await notification.update({ status: 'failed' });
    }
  }
}

async function retryPush(notificationId) {
  const notification = await Notification.findByPk(notificationId);
  if (!notification || notification.status === 'sent') return;
  await pushToSMN(notification.userId, notification);
}

async function getUserNotifications(userId, page = 1, pageSize = 20) {
  const { count, rows } = await Notification.findAndCountAll({
    where: { userId },
    order: [['created_at', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize
  });

  return {
    total: count,
    page,
    pageSize,
    list: rows
  };
}

async function markAsRead(notificationId, userId) {
  const notification = await Notification.findOne({
    where: { id: notificationId, userId }
  });
  if (!notification) return null;
  await notification.update({ isRead: true });
  return notification;
}

async function markAllAsRead(userId) {
  await Notification.update(
    { isRead: true },
    { where: { userId, isRead: false } }
  );
}

module.exports = {
  sendMatchNotification,
  sendClaimNotification,
  sendClaimConfirmedNotification,
  sendReturnConfirmedNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead
};
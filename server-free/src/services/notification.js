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

  await dispatchNotification(userId, notification);
  return notification;
}

async function sendClaimNotification(userId, claimId, itemName) {
  const notification = await Notification.create({
    userId,
    type: 'claim_request',
    title: '收到认领申请',
    content: { claimId, itemName },
    status: 'pending'
  });

  await dispatchNotification(userId, notification);
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

  await dispatchNotification(userId, notification);
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

  await dispatchNotification(userId, notification);
  return notification;
}

async function dispatchNotification(userId, notification) {
  const provider = config.notification.provider;

  try {
    if (provider === 'email') {
      await sendViaEmail(userId, notification);
    } else if (provider === 'webhook') {
      await sendViaWebhook(userId, notification);
    } else {
      console.log('通知仅存库:', notification.id);
      await notification.update({ status: 'sent' });
    }
  } catch (error) {
    console.error('通知推送失败:', error.message);
    const retryCount = (notification.retryCount || 0) + 1;
    if (retryCount <= 3) {
      await notification.update({ retryCount, status: 'pending' });
      setTimeout(() => retryPush(notification.id), 5000);
    } else {
      await notification.update({ status: 'failed' });
    }
  }
}

async function sendViaEmail(userId, notification) {
  const user = await User.findByPk(userId);
  if (!user || !user.email) {
    console.log('用户无邮箱，跳过邮件通知:', userId);
    await notification.update({ status: 'sent' });
    return;
  }

  const nodemailer = require('nodemailer');
  const emailConfig = config.notification.email;

  if (!emailConfig.host || !emailConfig.user) {
    console.log('SMTP未配置，通知仅存库:', notification.id);
    await notification.update({ status: 'sent' });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.port === 465,
    auth: { user: emailConfig.user, pass: emailConfig.pass }
  });

  const htmlBody = buildEmailHtml(notification);

  await transporter.sendMail({
    from: emailConfig.from || emailConfig.user,
    to: user.email,
    subject: `[校园失物招领] ${notification.title}`,
    html: htmlBody
  });

  await notification.update({ status: 'sent' });
  console.log('邮件通知已发送:', user.email);
}

async function sendViaWebhook(userId, notification) {
  const axios = require('axios');
  const webhookUrl = config.notification.webhook.url;

  if (!webhookUrl) {
    await notification.update({ status: 'sent' });
    return;
  }

  await axios.post(webhookUrl, {
    userId,
    type: notification.type,
    title: notification.title,
    content: notification.content,
    timestamp: new Date().toISOString()
  }, { timeout: 5000 });

  await notification.update({ status: 'sent' });
}

function buildEmailHtml(notification) {
  const content = notification.content || {};
  let details = '';

  if (notification.type === 'match_found') {
    details = `
      <p><strong>物品类别：</strong>${content.category || '-'}</p>
      <p><strong>拾到地点：</strong>${content.location || '-'}</p>
      <p><strong>拾到时间：</strong>${content.foundTime || '-'}</p>
      <p><strong>匹配度：</strong>${content.matchScore || 0}%</p>
    `;
  } else {
    details = `<p>请登录平台查看详情。</p>`;
  }

  return `
    <div style="max-width:600px;margin:0 auto;font-family:sans-serif;">
      <div style="background:#07C160;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
        <h2>校园失物招领</h2>
      </div>
      <div style="padding:20px;background:#f9f9f9;border-radius:0 0 8px 8px;">
        <h3>${notification.title}</h3>
        ${details}
        <a href="${process.env.SITE_URL || 'http://localhost:3000'}/notifications"
           style="display:inline-block;background:#07C160;color:#fff;padding:10px 20px;border-radius:4px;text-decoration:none;margin-top:10px;">
          查看详情
        </a>
      </div>
    </div>
  `;
}

async function retryPush(notificationId) {
  const notification = await Notification.findByPk(notificationId);
  if (!notification || notification.status === 'sent') return;
  await dispatchNotification(notification.userId, notification);
}

async function getUserNotifications(userId, page = 1, pageSize = 20) {
  const { count, rows } = await Notification.findAndCountAll({
    where: { userId },
    order: [['created_at', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize
  });
  return { total: count, page, pageSize, list: rows };
}

async function markAsRead(notificationId, userId) {
  const notification = await Notification.findOne({ where: { id: notificationId, userId } });
  if (!notification) return null;
  await notification.update({ isRead: true });
  return notification;
}

async function markAllAsRead(userId) {
  await Notification.update({ isRead: true }, { where: { userId, isRead: false } });
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
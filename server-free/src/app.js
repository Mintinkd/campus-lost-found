const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const config = require('./config');
const { sequelize } = require('./models');
const responseMiddleware = require('./middleware/response');

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const searchRoutes = require('./routes/search');
const claimRoutes = require('./routes/claims');
const notifRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const configRouter = require('./routes/config');

const itemService = require('./services/item');
const claimService = require('./services/claim');
const uploadService = require('./services/upload');

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(responseMiddleware);

const uploadDir = path.join(__dirname, '..', config.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

app.use('/uploads', express.static(uploadDir));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/items', itemRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/claims', claimRoutes);
app.use('/api/v1/notifications', notifRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use(configRouter());

app.get('/api/v1/health', (req, res) => {
  res.success({
    status: 'ok',
    timestamp: new Date().toISOString(),
    config: {
      db: config.db.dialect,
      recognition: config.recognition.provider,
      notification: config.notification.provider,
      upload: config.upload.provider
    }
  });
});

app.use((err, req, res, next) => {
  console.error('未捕获异常:', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ code: 2010, message: '照片大小不能超过10MB', data: null });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ code: 2011, message: '最多上传5张照片', data: null });
    }
    return res.status(400).json({ code: 2012, message: err.message, data: null });
  }

  if (err.message === '仅支持jpg/png格式照片') {
    return res.status(400).json({ code: 2013, message: err.message, data: null });
  }

  res.status(500).json({ code: 9999, message: '服务器内部错误', data: null });
});

async function startServer() {
  try {
    if (config.nodeEnv === 'production') {
      const warnings = [];
      if (config.jwt.secret === 'dev_secret_change_me') warnings.push('JWT_SECRET 未设置，使用不安全默认值');
      if (config.encryption.key === '0123456789abcdef0123456789abcdef') warnings.push('ENCRYPTION_KEY 未设置，使用不安全默认值');
      if (config.encryption.iv === '0123456789abcdef') warnings.push('ENCRYPTION_IV 未设置，使用不安全默认值');
      if (warnings.length > 0) {
        console.warn('⚠️ 生产环境安全警告:');
        warnings.forEach(w => console.warn('  - ' + w));
        console.warn('  请在 Render Dashboard → Environment 中设置上述环境变量');
      }
    }

    await sequelize.authenticate();
    console.log(`数据库连接成功 (${config.db.dialect})`);

    if (config.db.dialect === 'postgres') {
      const [results] = await sequelize.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name NOT IN ('id') ORDER BY ordinal_position LIMIT 5"
      );
      if (results.length > 0) {
        const needsRebuild = results.some(r => {
          const col = r.column_name;
          return col.indexOf('_') === -1 && col !== col.toUpperCase();
        });
        if (needsRebuild) {
          console.error('❌ 检测到旧schema(驼峰列名)，需要重建数据库。');
          console.error('   请设置环境变量 FORCE_SCHEMA_REBUILD=true 后重新部署');
          console.error('   警告: 重建将删除所有数据!');
          if (process.env.FORCE_SCHEMA_REBUILD === 'true') {
            console.log('[DB] FORCE_SCHEMA_REBUILD=true，重建表...');
            await sequelize.drop();
            console.log('[DB] 旧表已删除');
          } else {
            console.warn('[DB] 跳过重建，使用现有schema。部分功能可能异常。');
          }
        }
      }
    }

    await sequelize.sync({ alter: true });
    console.log('数据库同步完成');

    const { Role, User } = require('./models');
    const bcrypt = require('bcryptjs');
    const [superAdminRole, created] = await Role.findOrCreate({
      where: { name: 'super_admin' },
      defaults: { name: 'super_admin', permissions: Object.values(require('./middleware/adminAuth').PERMISSIONS) }
    });
    if (created) console.log('[Init] 创建 super_admin 角色');
    await Role.findOrCreate({
      where: { name: 'admin' },
      defaults: { name: 'admin', permissions: ['content:view', 'content:hide', 'content:delete', 'user:view', 'admin:log'] }
    });
    await Role.findOrCreate({
      where: { name: 'moderator' },
      defaults: { name: 'moderator', permissions: ['content:view', 'content:hide', 'user:view'] }
    });
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@campus.edu';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123456';
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const hashed = await bcrypt.hash(adminPass, 10);
      await User.create({
        openid: 'admin_' + Date.now(),
        nickname: '系统管理员',
        email: adminEmail,
        password: hashed,
        roleId: superAdminRole.id
      });
      console.log(`[Init] 创建管理员账号: ${adminEmail}`);
    } else if (!existingAdmin.roleId) {
      await existingAdmin.update({ roleId: superAdminRole.id });
      console.log(`[Init] 已为 ${adminEmail} 分配管理员角色`);
    }

    uploadService.initCloudinary();

    const schedule = require('node-schedule');
    schedule.scheduleJob('0 2 * * *', async () => {
      console.log('执行定时任务: 过期物品标记');
      const expired = await itemService.expireOldItems();
      console.log(`已标记 ${expired} 个物品为过期`);
    });

    schedule.scheduleJob('0 */1 * * *', async () => {
      console.log('执行定时任务: 过期认领清理');
      const expired = await claimService.expireOldClaims();
      if (expired > 0) console.log(`已清理 ${expired} 个过期认领`);
    });

    const port = config.port;
    app.listen(port, () => {
      console.log(`服务器启动成功，端口: ${port}`);
      console.log(`环境: ${config.nodeEnv}`);
      console.log(`数据库: ${config.db.dialect}`);
      console.log(`图像识别: ${config.recognition.provider}`);
      console.log(`通知推送: ${config.notification.provider}`);
    });
  } catch (err) {
    console.error('服务器启动失败:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
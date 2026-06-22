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
const configRouter = require('./routes/config');

const itemService = require('./services/item');
const claimService = require('./services/claim');

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
    await sequelize.authenticate();
    console.log(`数据库连接成功 (${config.db.dialect})`);

    if (config.db.dialect === 'postgres') {
      const [results] = await sequelize.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' LIMIT 1"
      );
      if (results.length > 0) {
        const col = results[0].column_name;
        if (col === col.toLowerCase() && col.indexOf('_') === -1) {
          console.log('[DB] 检测到旧schema(驼峰列名)，重建表...');
          await sequelize.drop();
          console.log('[DB] 旧表已删除');
        }
      }
    }

    await sequelize.sync({ alter: true });
    console.log('数据库同步完成');

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
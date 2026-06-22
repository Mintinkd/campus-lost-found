const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const schedule = require('node-schedule');

const config = require('./config');
const { sequelize } = require('./models');
const responseMiddleware = require('./middleware/response');

const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const searchRoutes = require('./routes/search');
const claimRoutes = require('./routes/claims');
const notifRoutes = require('./routes/notifications');

const itemService = require('./services/item');
const claimService = require('./services/claim');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(responseMiddleware);

app.use('/uploads', express.static(path.join(__dirname, '..', config.upload.dir)));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/items', itemRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/claims', claimRoutes);
app.use('/api/v1/notifications', notifRoutes);

app.get('/api/v1/health', (req, res) => {
  res.success({ status: 'ok', timestamp: new Date().toISOString() });
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
    console.log('数据库连接成功');

    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('数据库同步完成');

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

    app.listen(config.port, () => {
      console.log(`服务器启动成功，端口: ${config.port}`);
      console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('服务器启动失败:', err);
    process.exit(1);
  }
}

startServer();

module.exports = app;
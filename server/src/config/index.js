require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    name: process.env.DB_NAME || 'campus_lost_found',
    user: process.env.DB_USER || 'root',
    pass: process.env.DB_PASS || '',
    dialect: 'mysql',
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
  },
  hwCloud: {
    ak: process.env.HW_CLOUD_AK || '',
    sk: process.env.HW_CLOUD_SK || '',
    projectId: process.env.HW_CLOUD_PROJECT_ID || '',
    region: process.env.HW_CLOUD_REGION || 'cn-north-4'
  },
  smn: {
    topicUrn: process.env.SMN_TOPIC_URN || ''
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef',
    iv: process.env.ENCRYPTION_IV || '0123456789abcdef'
  },
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || ''
  }
};
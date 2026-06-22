require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  db: {
    dialect: process.env.DB_DIALECT || 'sqlite',
    storage: process.env.DB_STORAGE || './data/campus_lost_found.db',
    host: process.env.DB_HOST || '',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'campus_lost_found',
    user: process.env.DB_USER || '',
    pass: process.env.DB_PASS || '',
    ssl: process.env.DB_SSL === 'true' || process.env.DB_SSL === '1',
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
  },
  recognition: {
    provider: process.env.RECOGNITION_PROVIDER || 'tensorflow',
    hwCloud: {
      ak: process.env.HW_CLOUD_AK || '',
      sk: process.env.HW_CLOUD_SK || '',
      projectId: process.env.HW_CLOUD_PROJECT_ID || '',
      region: process.env.HW_CLOUD_REGION || 'cn-north-4'
    }
  },
  notification: {
    provider: process.env.NOTIFICATION_PROVIDER || 'email',
    email: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || ''
    },
    webhook: {
      url: process.env.NOTIFICATION_WEBHOOK_URL || ''
    }
  },
  upload: {
    provider: process.env.UPLOAD_PROVIDER || 'local',
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef',
    iv: process.env.ENCRYPTION_IV || '0123456789abcdef'
  },
  auth: {
    provider: process.env.AUTH_PROVIDER || 'local',
    wechat: {
      appId: process.env.WECHAT_APP_ID || '',
      appSecret: process.env.WECHAT_APP_SECRET || ''
    }
  }
};
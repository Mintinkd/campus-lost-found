const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config');

const sequelizeOptions = {
  pool: config.db.pool,
  logging: config.nodeEnv === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
};

if (config.db.dialect === 'sqlite') {
  sequelizeOptions.dialect = 'sqlite';
  sequelizeOptions.storage = config.db.storage;
} else if (config.db.dialect === 'postgres') {
  sequelizeOptions.dialect = 'postgres';
  sequelizeOptions.host = config.db.host;
  sequelizeOptions.port = config.db.port;
  sequelizeOptions.dialectOptions = {
    ssl: config.db.ssl ? { rejectUnauthorized: false } : undefined
  };
} else {
  sequelizeOptions.dialect = config.db.dialect;
  sequelizeOptions.host = config.db.host;
  sequelizeOptions.port = config.db.port;
}

const sequelize = new Sequelize(
  config.db.dialect === 'sqlite' ? 'sqlite' : config.db.name,
  config.db.dialect === 'sqlite' ? '' : config.db.user,
  config.db.dialect === 'sqlite' ? '' : config.db.pass,
  sequelizeOptions
);

const DYNAMIC_TYPES = {
  sqlite: { JSON_T: DataTypes.JSON, STRING_MAX: DataTypes.STRING(500) },
  postgres: { JSON_T: DataTypes.JSONB, STRING_MAX: DataTypes.STRING(500) }
};
const types = DYNAMIC_TYPES[config.db.dialect] || DYNAMIC_TYPES.sqlite;

const User = sequelize.define('User', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  openid: { type: DataTypes.STRING(64), unique: true, allowNull: false },
  nickname: { type: DataTypes.STRING(100), allowNull: false, defaultValue: '用户' },
  avatarUrl: { type: DataTypes.STRING(500), allowNull: false, defaultValue: '' },
  phoneEncrypted: { type: DataTypes.STRING(200) },
  email: { type: DataTypes.STRING(200) },
  password: { type: DataTypes.STRING(200) },
  campus: { type: DataTypes.STRING(100) },
  roleId: { type: DataTypes.STRING(36), defaultValue: null },
  isBanned: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'users'
});

const Item = sequelize.define('Item', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  finderId: { type: DataTypes.STRING(36), allowNull: false },
  category: { type: DataTypes.STRING(50), allowNull: false },
  confidence: { type: DataTypes.DECIMAL(3, 2) },
  description: { type: DataTypes.TEXT },
  location: { type: DataTypes.STRING(100), allowNull: false },
  foundTime: { type: DataTypes.DATE, allowNull: false },
  photos: { type: types.JSON_T, allowNull: false, defaultValue: [] },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    allowNull: false,
    validate: { isIn: [['pending', 'claiming', 'returned', 'expired', 'hidden']] }
  },
  deletedAt: { type: DataTypes.DATE, defaultValue: null }
}, {
  tableName: 'items',
  indexes: [
    { fields: ['category'] },
    { fields: ['location'] },
    { fields: ['status'] },
    { fields: ['found_time'] }
  ]
});

const SearchRecord = sequelize.define('SearchRecord', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  ownerId: { type: DataTypes.STRING(36), allowNull: false },
  searchText: { type: DataTypes.TEXT, allowNull: false },
  parsedDimensions: { type: types.JSON_T }
}, {
  tableName: 'search_records',
  updatedAt: false,
  indexes: [{ fields: ['owner_id'] }]
});

const Claim = sequelize.define('Claim', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  itemId: { type: DataTypes.STRING(36), allowNull: false },
  claimerId: { type: DataTypes.STRING(36), allowNull: false },
  claimReason: { type: DataTypes.STRING(500), allowNull: false },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    allowNull: false,
    validate: { isIn: [['pending', 'confirmed', 'returning', 'completed', 'rejected', 'expired']] }
  },
  confirmedAt: { type: DataTypes.DATE },
  returnedAt: { type: DataTypes.DATE }
}, {
  tableName: 'claims',
  indexes: [
    { fields: ['item_id'] },
    { fields: ['claimer_id'] },
    { fields: ['status'] }
  ]
});

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.STRING(36), allowNull: false },
  type: { type: DataTypes.STRING(50), allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  content: { type: types.JSON_T, allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  retryCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'pending',
    allowNull: false,
    validate: { isIn: [['pending', 'sent', 'failed']] }
  }
}, {
  tableName: 'notifications',
  updatedAt: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] }]
});

const Role = sequelize.define('Role', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING(50), unique: true, allowNull: false },
  permissions: { type: types.JSON_T, allowNull: false, defaultValue: [] }
}, {
  tableName: 'roles'
});

const AdminLog = sequelize.define('AdminLog', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  adminId: { type: DataTypes.STRING(36), allowNull: false },
  action: { type: DataTypes.STRING(100), allowNull: false },
  targetType: { type: DataTypes.STRING(50), allowNull: false },
  targetId: { type: DataTypes.STRING(36), allowNull: false },
  detail: { type: DataTypes.TEXT }
}, {
  tableName: 'admin_logs',
  updatedAt: false,
  indexes: [
    { fields: ['admin_id'] },
    { fields: ['target_type', 'target_id'] }]
});

User.hasMany(Item, { foreignKey: 'finderId', as: 'items' });
Item.belongsTo(User, { foreignKey: 'finderId', as: 'finder' });
Item.hasMany(Claim, { foreignKey: 'itemId', as: 'claims' });
Claim.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });
User.hasMany(Claim, { foreignKey: 'claimerId', as: 'claims' });
Claim.belongsTo(User, { foreignKey: 'claimerId', as: 'claimer' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.belongsTo(Role, { foreignKey: 'roleId', as: 'role', constraints: false });
Role.hasMany(User, { foreignKey: 'roleId', as: 'users', constraints: false });
User.hasMany(AdminLog, { foreignKey: 'adminId', as: 'adminLogs', constraints: false });
AdminLog.belongsTo(User, { foreignKey: 'adminId', as: 'admin', constraints: false });

module.exports = { sequelize, User, Item, SearchRecord, Claim, Notification, Role, AdminLog };
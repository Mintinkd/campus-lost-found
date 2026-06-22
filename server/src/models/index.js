const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.pass, {
  host: config.db.host,
  port: config.db.port,
  dialect: config.db.dialect,
  pool: config.db.pool,
  logging: process.env.NODE_ENV === 'development' ? console.log : false
});

const User = sequelize.define('User', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  openid: { type: DataTypes.STRING(64), unique: true, allowNull: false },
  nickname: { type: DataTypes.STRING(100), allowNull: false },
  avatarUrl: { type: DataTypes.STRING(500), allowNull: false },
  phoneEncrypted: { type: DataTypes.STRING(200), field: 'phone_encrypted' },
  campus: { type: DataTypes.STRING(100) }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Item = sequelize.define('Item', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  finderId: { type: DataTypes.STRING(36), allowNull: false, field: 'finder_id' },
  category: { type: DataTypes.STRING(50), allowNull: false },
  confidence: { type: DataTypes.DECIMAL(3, 2) },
  description: { type: DataTypes.TEXT },
  location: { type: DataTypes.STRING(100), allowNull: false },
  foundTime: { type: DataTypes.DATE, allowNull: false, field: 'found_time' },
  photos: { type: DataTypes.JSON, allowNull: false },
  status: {
    type: DataTypes.ENUM('pending', 'claiming', 'returned', 'expired'),
    defaultValue: 'pending',
    allowNull: false
  }
}, {
  tableName: 'items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['category'] },
    { fields: ['location'] },
    { fields: ['status'] },
    { fields: ['found_time'] }
  ]
});

const SearchRecord = sequelize.define('SearchRecord', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  ownerId: { type: DataTypes.STRING(36), allowNull: false, field: 'owner_id' },
  searchText: { type: DataTypes.TEXT, allowNull: false, field: 'search_text' },
  parsedDimensions: { type: DataTypes.JSON, field: 'parsed_dimensions' }
}, {
  tableName: 'search_records',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['owner_id'] }
  ]
});

const Claim = sequelize.define('Claim', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  itemId: { type: DataTypes.STRING(36), allowNull: false, field: 'item_id' },
  claimerId: { type: DataTypes.STRING(36), allowNull: false, field: 'claimer_id' },
  claimReason: { type: DataTypes.STRING(500), allowNull: false, field: 'claim_reason' },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'returning', 'completed', 'rejected', 'expired'),
    defaultValue: 'pending',
    allowNull: false
  },
  confirmedAt: { type: DataTypes.DATE, field: 'confirmed_at' },
  returnedAt: { type: DataTypes.DATE, field: 'returned_at' }
}, {
  tableName: 'claims',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['item_id'] },
    { fields: ['claimer_id'] },
    { fields: ['status'] }
  ]
});

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.STRING(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.STRING(36), allowNull: false, field: 'user_id' },
  type: { type: DataTypes.STRING(50), allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  content: { type: DataTypes.JSON, allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_read' },
  retryCount: { type: DataTypes.INTEGER, defaultValue: 0, field: 'retry_count' },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed'),
    defaultValue: 'pending',
    allowNull: false
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['status'] }
  ]
});

User.hasMany(Item, { foreignKey: 'finderId', as: 'items' });
Item.belongsTo(User, { foreignKey: 'finderId', as: 'finder' });

Item.hasMany(Claim, { foreignKey: 'itemId', as: 'claims' });
Claim.belongsTo(Item, { foreignKey: 'itemId', as: 'item' });

User.hasMany(Claim, { foreignKey: 'claimerId', as: 'claims' });
Claim.belongsTo(User, { foreignKey: 'claimerId', as: 'claimer' });

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  User,
  Item,
  SearchRecord,
  Claim,
  Notification
};
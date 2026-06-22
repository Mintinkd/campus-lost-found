const { Item, SearchRecord, User } = require('../models');
const { Op } = require('sequelize');
const config = require('../config');

const CATEGORY_WEIGHT = 0.4;
const LOCATION_WEIGHT = 0.3;
const TIME_WEIGHT = 0.2;
const FEATURE_WEIGHT = 0.1;
const MATCH_THRESHOLD = 0.3;
const NOTIFICATION_THRESHOLD = 0.6;

const CATEGORY_ALIASES = {
  '雨伞': ['伞', '雨伞', '遮阳伞', '折叠伞'],
  '钱包': ['钱包', '皮夹', '钱夹'],
  '钥匙': ['钥匙', '钥匙串', '钥匙扣', '门禁卡'],
  '手机': ['手机', '电话', 'iPhone', '华为手机'],
  '书包': ['书包', '背包', '双肩包'],
  '水杯': ['水杯', '保温杯', '杯子', '水壶'],
  '耳机': ['耳机', '蓝牙耳机', 'AirPods', '有线耳机'],
  '证件': ['身份证', '学生证', '校园卡', '饭卡', '证件'],
  '手表': ['手表', '手环', 'iWatch'],
  '衣服': ['外套', '夹克', '卫衣', '衣服', '上衣']
};

const LOCATION_ALIASES = {
  '图书馆': ['图书馆', '图书楼', '阅览室'],
  '食堂': ['食堂', '餐厅', '饭堂'],
  '教学楼': ['教学楼', '教室', '阶梯教室'],
  '操场': ['操场', '运动场', '体育场', '田径场'],
  '宿舍': ['宿舍', '寝室', '公寓'],
  '实验室': ['实验室', '实验楼'],
  '行政楼': ['行政楼', '办公楼'],
  '校门口': ['校门口', '校门', '大门']
};

function parseNaturalLanguage(text) {
  const dimensions = { time: null, location: null, category: null, color: null, brand: null, rawText: text };

  const timePatterns = [
    { regex: /今天|今日/, value: 'today' },
    { regex: /昨天|昨日/, value: 'yesterday' },
    { regex: /前天/, value: 'day_before_yesterday' },
    { regex: /上周|上星期/, value: 'last_week' },
    { regex: /本周|这周|本星期|这星期/, value: 'this_week' },
    { regex: /(\d+)天前/, value: 'days_ago' },
    { regex: /上午|早上|早晨/, value: 'morning' },
    { regex: /下午|午后/, value: 'afternoon' },
    { regex: /晚上|傍晚|夜间/, value: 'evening' }
  ];

  for (const pattern of timePatterns) {
    if (pattern.regex.test(text)) {
      dimensions.time = { type: pattern.value, raw: text.match(pattern.regex)[0] };
      break;
    }
  }

  for (const [category, aliases] of Object.entries(CATEGORY_ALIASES)) {
    for (const alias of aliases) {
      if (text.includes(alias)) { dimensions.category = category; break; }
    }
    if (dimensions.category) break;
  }

  for (const [location, aliases] of Object.entries(LOCATION_ALIASES)) {
    for (const alias of aliases) {
      if (text.includes(alias)) { dimensions.location = location; break; }
    }
    if (dimensions.location) break;
  }

  const colorPatterns = ['红色', '蓝色', '绿色', '黄色', '黑色', '白色', '粉色', '紫色', '橙色', '灰色', '棕色', '银色', '金色'];
  for (const color of colorPatterns) { if (text.includes(color)) { dimensions.color = color; break; } }

  const brandPatterns = ['Apple', 'iPhone', '华为', '小米', '三星', 'Nike', 'Adidas', '联想', '戴尔'];
  for (const brand of brandPatterns) { if (text.includes(brand)) { dimensions.brand = brand; break; } }

  return dimensions;
}

function calculateTimeMatch(searchTime, itemFoundTime) {
  if (!searchTime) return 0.5;
  const now = new Date();
  const itemDate = new Date(itemFoundTime);
  const diffDays = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24));
  switch (searchTime.type) {
    case 'today': return diffDays === 0 ? 1.0 : 0.3;
    case 'yesterday': return diffDays === 1 ? 1.0 : diffDays <= 2 ? 0.5 : 0.1;
    case 'day_before_yesterday': return diffDays === 2 ? 1.0 : diffDays <= 3 ? 0.5 : 0.1;
    case 'last_week': return diffDays >= 7 && diffDays <= 14 ? 1.0 : diffDays >= 5 && diffDays <= 16 ? 0.5 : 0.2;
    case 'this_week': return diffDays <= 7 ? 1.0 : diffDays <= 10 ? 0.5 : 0.1;
    case 'morning':
    case 'afternoon':
    case 'evening': return diffDays <= 1 ? 0.8 : 0.3;
    default: return 0.5;
  }
}

function calculateCategoryMatch(searchCategory, itemCategory) {
  if (!searchCategory) return 0.5;
  if (searchCategory === itemCategory) return 1.0;
  const aliases = CATEGORY_ALIASES[searchCategory] || [];
  if (aliases.includes(itemCategory)) return 0.9;
  const itemAliases = CATEGORY_ALIASES[itemCategory] || [];
  if (itemAliases.includes(searchCategory)) return 0.9;
  return 0.1;
}

function calculateLocationMatch(searchLocation, itemLocation) {
  if (!searchLocation) return 0.5;
  if (searchLocation === itemLocation) return 1.0;
  const aliases = LOCATION_ALIASES[searchLocation] || [];
  if (aliases.includes(itemLocation)) return 0.9;
  if (itemLocation.includes(searchLocation) || searchLocation.includes(itemLocation)) return 0.7;
  return 0.1;
}

function calculateFeatureMatch(searchColor, searchBrand, item) {
  let score = 0, factors = 0;
  if (searchColor) { factors++; score += (item.description && item.description.includes(searchColor)) ? 1.0 : 0.1; }
  if (searchBrand) { factors++; score += (item.description && item.description.includes(searchBrand)) ? 1.0 : 0.1; }
  return factors > 0 ? score / factors : 0.5;
}

function calculateMatchScore(dimensions, item) {
  return calculateCategoryMatch(dimensions.category, item.category) * CATEGORY_WEIGHT +
    calculateLocationMatch(dimensions.location, item.location) * LOCATION_WEIGHT +
    calculateTimeMatch(dimensions.time, item.foundTime) * TIME_WEIGHT +
    calculateFeatureMatch(dimensions.color, dimensions.brand, item) * FEATURE_WEIGHT;
}

async function semanticSearch(userId, searchText) {
  const dimensions = parseNaturalLanguage(searchText);
  await SearchRecord.create({ ownerId: userId, searchText, parsedDimensions: dimensions });

  const whereClause = { status: { [Op.in]: ['pending', 'claiming'] } };
  const hasCategory = !!dimensions.category;
  const hasLocation = !!dimensions.location;

  if (hasCategory) {
    const categoryAliases = CATEGORY_ALIASES[dimensions.category] || [dimensions.category];
    if (config.db.dialect === 'postgres') {
      whereClause[Op.or] = [
        { category: { [Op.in]: categoryAliases } },
        { description: { [Op.iLike]: '%' + dimensions.category + '%' } }
      ];
    } else {
      whereClause.category = { [Op.in]: categoryAliases };
    }
  }
  if (hasLocation && !whereClause[Op.or]) {
    const locationAliases = LOCATION_ALIASES[dimensions.location] || [dimensions.location];
    whereClause.location = { [Op.in]: locationAliases };
  }

  if (!hasCategory && !hasLocation && searchText.length >= 2) {
    if (config.db.dialect === 'postgres') {
      whereClause[Op.or] = [
        { description: { [Op.iLike]: '%' + searchText + '%' } },
        { location: { [Op.iLike]: '%' + searchText + '%' } },
        { category: { [Op.iLike]: '%' + searchText + '%' } }
      ];
    } else {
      whereClause[Op.or] = [
        { description: { [Op.substring]: searchText } },
        { location: { [Op.substring]: searchText } }
      ];
    }
  }

  const items = await Item.findAll({
    where: whereClause,
    include: [{ model: User, as: 'finder', attributes: ['id', 'nickname', 'avatarUrl'] }],
    order: [['foundTime', 'DESC']],
    limit: 100
  });

  const results = items.map(item => {
    const score = calculateMatchScore(dimensions, item);
    return { item: item.toJSON(), matchScore: Math.round(score * 100) / 100 };
  });

  const filtered = results.filter(r => r.matchScore >= MATCH_THRESHOLD);
  filtered.sort((a, b) => b.matchScore - a.matchScore);
  return { dimensions, results: filtered, total: filtered.length };
}

async function checkAndNotifyMatch(item) {
  const notificationService = require('./notification');
  const recentSearches = await SearchRecord.findAll({
    where: { createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
  });

  for (const search of recentSearches) {
    const dimensions = search.parsedDimensions || parseNaturalLanguage(search.searchText);
    const score = calculateMatchScore(dimensions, item);
    if (score >= NOTIFICATION_THRESHOLD) {
      await notificationService.sendMatchNotification(search.ownerId, item, score);
    }
  }
}

module.exports = { parseNaturalLanguage, semanticSearch, calculateMatchScore, checkAndNotifyMatch, MATCH_THRESHOLD, NOTIFICATION_THRESHOLD };
const matchingService = require('../services/matching');
const { SearchRecord } = require('../models');

exports.semanticSearch = async (req, res) => {
  try {
    const { searchText } = req.body;
    if (!searchText || !searchText.trim()) return res.error(3001, '请输入失物描述');
    const result = await matchingService.semanticSearch(req.userId, searchText.trim());
    res.success(result);
  } catch (err) {
    res.error(3002, err.message);
  }
};

exports.getSearchHistory = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const { count, rows } = await SearchRecord.findAndCountAll({
      where: { ownerId: req.userId },
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize),
      offset: (parseInt(page) - 1) * parseInt(pageSize)
    });
    res.success({ total: count, list: rows });
  } catch (err) {
    res.error(3003, err.message);
  }
};
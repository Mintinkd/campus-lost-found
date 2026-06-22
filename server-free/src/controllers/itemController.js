const itemService = require('../services/item');
const imageRecognitionService = require('../services/imageRecognition');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const uploadDir = config.upload.dir;
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('仅支持jpg/png格式照片'));
  }
});

exports.uploadMiddleware = upload.array('photos', 5);

exports.createItem = async (req, res) => {
  try {
    const photos = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    const { category, description, location, foundTime } = req.body;

    if (!location) return res.error(2001, '拾到地点为必填项');
    if (!foundTime) return res.error(2002, '拾到时间为必填项');
    if (photos.length === 0) return res.error(2003, '请上传至少一张照片');

    const item = await itemService.createItem(req.userId, {
      category: category || '其他', description, location, foundTime, photos
    });
    res.success(item);
  } catch (err) {
    res.error(2004, err.message);
  }
};

exports.recognizeAndCreate = async (req, res) => {
  try {
    const photos = req.files ? req.files.map(f => `/uploads/${f.filename}`) : [];
    const { description, location, foundTime, category } = req.body;

    if (!location) return res.error(2001, '拾到地点为必填项');
    if (!foundTime) return res.error(2002, '拾到时间为必填项');
    if (photos.length === 0) return res.error(2003, '请上传至少一张照片');

    let imageBase64 = null;
    if (req.files && req.files.length > 0) {
      imageBase64 = fs.readFileSync(req.files[0].path).toString('base64');
    }

    const result = await itemService.recognizeAndCreate(req.userId, imageBase64, {
      category, description, location, foundTime, photos
    });

    if (result.error) return res.error(result.code, result.error);
    res.success(result);
  } catch (err) {
    res.error(2004, err.message);
  }
};

exports.getItems = async (req, res) => {
  try {
    const { page, pageSize, category, location, status, keyword } = req.query;
    const result = await itemService.getItems({
      page: parseInt(page) || 1, pageSize: parseInt(pageSize) || 20,
      category, location, status, keyword
    });
    res.success(result);
  } catch (err) {
    res.error(2005, err.message);
  }
};

exports.getItemById = async (req, res) => {
  try {
    const item = await itemService.getItemById(req.params.id);
    if (!item) return res.error(2006, '物品不存在');
    res.success(item);
  } catch (err) {
    res.error(2007, err.message);
  }
};

exports.updateItem = async (req, res) => {
  try {
    const item = await itemService.updateItem(req.params.id, req.userId, req.body);
    if (!item) return res.error(2008, '物品不存在或无权修改');
    res.success(item);
  } catch (err) {
    res.error(2009, err.message);
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const result = await itemService.deleteItem(req.params.id, req.userId);
    if (result === false) return res.error(2010, '物品不存在或无权删除');
    if (result.error) return res.error(result.code, result.error);
    res.success(null, '删除成功');
  } catch (err) {
    res.error(2011, err.message);
  }
};

exports.getMyItems = async (req, res) => {
  try {
    const { page, pageSize } = req.query;
    const result = await itemService.getMyItems(req.userId, parseInt(page) || 1, parseInt(pageSize) || 20);
    res.success(result);
  } catch (err) {
    res.error(2012, err.message);
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = imageRecognitionService.getCategories();
    res.success(categories);
  } catch (err) {
    res.error(2013, err.message);
  }
};
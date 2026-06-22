const express = require('express');
const router = express.Router();

const itemCtrl = require('../controllers/itemController');
const { auth } = require('../middleware/auth');

router.post('/', auth, itemCtrl.uploadMiddleware, itemCtrl.recognizeAndCreate);
router.get('/', auth, itemCtrl.getItems);
router.get('/mine', auth, itemCtrl.getMyItems);
router.get('/categories', itemCtrl.getCategories);
router.get('/:id', auth, itemCtrl.getItemById);
router.put('/:id', auth, itemCtrl.updateItem);
router.delete('/:id', auth, itemCtrl.deleteItem);

module.exports = router;
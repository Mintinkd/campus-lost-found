const express = require('express');
const router = express.Router();
const searchCtrl = require('../controllers/searchController');
const { auth } = require('../middleware/auth');

router.post('/', auth, searchCtrl.semanticSearch);
router.get('/history', auth, searchCtrl.getSearchHistory);

module.exports = router;
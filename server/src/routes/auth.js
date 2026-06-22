const express = require('express');
const router = express.Router();

const authCtrl = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/login', authCtrl.login);
router.get('/profile', auth, authCtrl.getProfile);
router.put('/profile', auth, authCtrl.updateProfile);

module.exports = router;
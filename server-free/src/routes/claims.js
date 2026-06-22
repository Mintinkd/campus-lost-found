const express = require('express');
const router = express.Router();
const claimCtrl = require('../controllers/claimController');
const { auth } = require('../middleware/auth');
const { rateLimitClaims } = require('../middleware/rateLimit');

router.post('/', auth, rateLimitClaims, claimCtrl.createClaim);
router.get('/', auth, claimCtrl.getClaims);
router.put('/:id/confirm', auth, claimCtrl.confirmClaim);
router.put('/:id/reject', auth, claimCtrl.rejectClaim);
router.put('/:id/return', auth, claimCtrl.confirmReturn);
router.get('/:id/contact', auth, claimCtrl.getClaimContact);

module.exports = router;
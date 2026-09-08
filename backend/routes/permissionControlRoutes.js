const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  setPermissionControl,
  getPendingPermissionControls,
  acknowledgePermissionControls,
} = require('../controllers/permissionControlController');

const router = express.Router();

router.post('/', authMiddleware, setPermissionControl);
router.get('/pending', authMiddleware, getPendingPermissionControls);
router.post('/ack', authMiddleware, acknowledgePermissionControls);

module.exports = router;

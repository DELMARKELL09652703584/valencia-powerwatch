const express = require('express');
const router = express.Router();

router.use(require('./admin/users'));
router.use(require('./admin/configuration'));
router.use(require('./admin/operations'));

module.exports = router;

var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.json({
    message: 'Users endpoint is working',
    success: true
  });
});

module.exports = router;

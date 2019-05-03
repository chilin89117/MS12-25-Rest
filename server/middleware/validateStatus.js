const {body} = require('express-validator/check');

module.exports = [
  body('status', 'Status should be 3 to 255 characters long')
    .trim()
    .isLength({min: 3, max: 255})
];

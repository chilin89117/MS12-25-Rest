const {body} = require('express-validator/check');

module.exports = [
  body('title')
    .trim()
    .isLength({min: 5, max: 255}),
  body('content')
    .trim()
    .isLength({min: 5, max: 255})
];

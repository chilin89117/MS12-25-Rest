const {body} = require('express-validator/check');
const User = require('../models/User');

module.exports = [
  body('email')
    .isEmail()
    .withMessage('Email address format is not valid')
    .custom(value => {
      return User
        .findOne({email: value})
        .then(user => {
          if(user) return Promise.reject('Email in use. Please choose another');
          else return Promise.resolve(true);
        });
    })
    .normalizeEmail(),
  body('password', 'Password must be 6 to 20 characters long')
    .trim()
    .isLength({min: 6, max: 20}),
  body('name', 'Name must be 2 to 15 characters long')
    .trim()
    .isLength({min: 2, max: 15})
];

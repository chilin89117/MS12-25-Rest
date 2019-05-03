const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {validationResult} = require('express-validator/check');
const User = require('../models/User');

// POST /auth/signup ==========================================================
exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    const error = new Error('Signup validation failed');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const {email, password, name} = req.body;
  bcrypt
    .hash(password, 12)
    .then(hashed => {
      const user = new User({email, password: hashed, name});
      return user.save();
    })
    .then(user => res
      .status(201)
      .json({message: 'User successfully created', id: user._id})
    )
    .catch(err => {
      if(!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

// POST /auth/login ===========================================================
exports.login = (req, res, next) => {
  const {email, password} = req.body;
  let user;
  User
    .findOne({email})
    .then(usr => {
      if(!usr) {
        const error = new Error('Email not found');
        error.statusCode = 401;
        throw error;
      }
      user = usr;
      return bcrypt.compare(password, usr.password);
    })
    .then(result => {
      if(!result) {
        const error = new Error('Password incorrect');
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {email: user.email, userId: user._id.toString()},
        process.env.JWT_SECRET,
        {expiresIn: '6h'}
      );
      res.status(200).json({token, userId: user._id.toString()});
    })
    .catch(err => {
      if(!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

// GET /auth/status ===========================================================
exports.getStatus = (req, res, next) => {
  User
    .findById(req.userId)
    .then(user => {
      if(!user) {
        const error = new Error('Invalid user ID');
        error.statudCode = 404;
        throw error;
      }
      res.status(200).json({status: user.status});
    })
    .catch(err => {
      if(!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

// PUT /auth/status ===========================================================
exports.updateStatus = (req, res, next) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    const error = new Error('Status update failed');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const newStatus = req.body.status;
  User
    .findById(req.userId)
    .then(user => {
      if(!user) {
        const error = new Error('Invalid user ID');
        error.statudCode = 404;
        throw error;
      }
      return user.update({$set: {status: newStatus}});
    })
    .then(() => res.status(200).json({message: 'Status successfully updated'}))
    .catch(err => {
      if(!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

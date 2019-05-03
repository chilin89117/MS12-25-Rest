const fs = require('fs');
const {validationResult} = require('express-validator/check');
const Post = require('../models/Post');
const User = require('../models/User');
const io = require('../socket');

// GET /feed/posts ============================================================
exports.getPosts = (req, res, next) => {
  const page = +req.query.page || 1;
  const perPage = 2;
  let numDocs;
  Post
    .countDocuments()
    .then(num => {
      numDocs = num;
      return Post
        .find()
        .populate('creator')
        .sort({createdAt: -1})
        .skip((page - 1) * perPage)
        .limit(perPage);
    })
    .then(posts => res.status(200).json({message: 'Fetched posts', posts, totalItems: numDocs}))
    .catch(err => {
      if(!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

// GET /feed/posts/:id ========================================================
exports.getPost = (req, res, next) => {
  const id = req.params.id;
  Post
    .findById(id)
    .then(post => {
      if(!post) {
        const err = new Error('Post not found!');
        err.statusCode = 404;
        throw err;
      }
      res.status(200).json({message: 'Fetched post', post});
    })
    .catch(err => {
      if(!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

// POST /feed/posts ===========================================================
exports.createPost = (req, res, next) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    // delete image already saved by Multer in case of validation error
    fs.unlink(req.file.path, err => {
      // ignore if there's an error or not
      console.log(`===== feedController (createPost) =====\n ${req.file.path} is deleted.`);
    })
    // build error message from 1st error in validation results
    const firstError = errors.array()[0];
    const errorDetail = `Param: "${firstError.param}", Message: "${firstError.msg}"`;
    const error = new Error(errorDetail);
    error.statusCode = 422;
    // will be handled in 'app.js'
    throw error;
  }
  if(!req.file) {
    const error = new Error('No image provided!');
    error.statusCode = 422;
    throw error;
  }
  const {title, content} = req.body;
  const imageUrl = req.file.path.replace('\\', '/');
  const post = new Post({
    title,
    content,
    imageUrl,
    creator: req.userId     // see '/middleware/isAuth'
  });
  post
    .save()
    .then(() => User.findByIdAndUpdate(req.userId, {$push: {posts: post}}))
    .then(user => {
      io.getIO().emit('posts', {
        action: 'create',
        post: {...post._doc, creator: {_id: user._id, name: user.name}}
      });
      res.status(201).json({message: 'Post successfully created', post})
    })
    .catch(err => {
      // delete image already saved by Multer in case of error
      fs.unlink(req.file.path, err => {
        // ignore if there's an error or not
        console.log(`===== feedController (createPost) =====\n ${req.file.path} is deleted.`);
      })
      if(!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

// PUT /feed/posts/:id ========================================================
exports.updatePost = (req, res, next) => {
  const errors = validationResult(req);
  if(!errors.isEmpty()) {
    // delete image already saved by Multer in case of validation error
    fs.unlink(req.file.path, err => {
      // ignore if there's an error or not
      console.log(`===== feedController createPost (updatePost) =====\n ${req.file.path} is deleted.`);
    })
    // build error message from 1st error in validation results
    const firstError = errors.array()[0];
    const errorDetail = `Param: "${firstError.param}", Message: "${firstError.msg}"`;
    const error = new Error(errorDetail);
    error.statusCode = 422;
    // will be handled in 'app.js'
    throw error;
  }
  const id = req.params.id;
  const {title, content} = req.body;
  let imageUrl = req.body.image;                              // no new file selected
  if(req.file) imageUrl = req.file.path.replace('\\', '/');   // new file selected
  if(!imageUrl) {
    const error = new Error('No file selected!');
    error.statusCode = 422;
    throw error;
  }
  let oldImage;
  Post
    .findById(id)
    .populate('creator')
    .then(post => {
      if(!post) {
        const err = new Error('Post not found!');
        err.statusCode = 404;
        throw err;
      }
      if(post.creator._id.toString() !== req.userId) {
        const err = new Error('Not authorized!');
        err.statusCode = 403;
        throw err;
      }
      oldImage = post.imageUrl;
      post.title = title;
      post.content = content;
      post.imageUrl = imageUrl;
      return post.save();
    })
    .then(post => {
      io.getIO().emit('posts', {action: 'update', post});
      // delete previous image if a new one is provided
      if(req.file) {
        fs.unlink(oldImage, err => {
          // ignore if there's an error or not
          console.log(`===== feedController (updatePost) =====\n ${oldImage} is deleted.`);
        })
      }
      res.status(200).json({message: 'Post successfully updated', post})
    })
    .catch(err => {
      // delete image already saved by Multer (if any) in case of error
      if(req.file) {
        fs.unlink(req.file.path, err => {
          // ignore if there's an error or not
          console.log(`===== feedController (updatePost) =====\n ${req.file.path} is deleted.`);
        })
      }
      if(!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

// DELETE /feed/posts/:id =====================================================
exports.deletePost = (req, res, next) => {
  const id = req.params.id;
  let imageToDelete;
  Post
    .findById(id)
    .then(post => {
      if(!post) {
        const err = new Error('Post not found!');
        err.statusCode = 404;
        throw err;
      }
      if(post.creator.toString() !== req.userId) {
        const err = new Error('Not authorized!');
        err.statusCode = 403;
        throw err;
      }
      imageToDelete = post.imageUrl;
      return post.remove();
    })
    .then(() => User.findByIdAndUpdate(req.userId, {$pull: {posts: id}}))
    .then(() => {
      io.getIO().emit('posts', {action: 'delete', post: id});
      // delete image for this post
      fs.unlink(imageToDelete, err => {
        // ignore if there's an error or not
        console.log(`===== feedController (deletePost) =====\n ${imageToDelete} is deleted.`);
      })
      res.status(200).json({message: 'Post deleted!'});
    })
    .catch(err => {
      if(!err.statusCode) err.statusCode = 500;
      next(err);
    });
};

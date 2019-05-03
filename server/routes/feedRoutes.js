const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const isAuth = require('../middleware/isAuth');
const validatePost = require('../middleware/validatePost');

router.get('/posts', isAuth, feedController.getPosts);
router.get('/posts/:id', isAuth, feedController.getPost);
router.post('/posts', isAuth, validatePost, feedController.createPost);
router.put('/posts/:id', isAuth, validatePost, feedController.updatePost);
router.delete('/posts/:id', isAuth, feedController.deletePost);

module.exports = router;

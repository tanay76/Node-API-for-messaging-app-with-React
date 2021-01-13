const express = require('express');
const { body } = require('express-validator');
const { verifyAccessToken } = require('../helpers/jwt-helper');

const router = express.Router();

const feedController = require('../controllers/feed');

//GET ALL POSTS - GET - /feed/posts:
router.get('/posts', verifyAccessToken, feedController.getPosts);
//TO GET A SINGLE POST - GET - /feed/post/postId:
router.get('/post/:postId', verifyAccessToken, feedController.getSinglePost);
//POST ANY POST - POST - /feed/post:
router.post(
  '/post',
  verifyAccessToken,
  [
    body('title')
      .trim()
      .isLength({ min: 5 }),
    body('content')
      .trim()
      .isLength({ min: 5 })
  ], 
  feedController.createPost);
//EDIT POST - PUT - /feed/post/postId:
router.put(
  '/post/:postId',
  verifyAccessToken,
  [
    body('title')
    .trim()
    .isLength({ min: 5 }),
    body('content')
    .trim()
    .isLength({ min: 5 })
  ],
  feedController.updatePost);
//DELETE POST - DELETE - /feed/post/postId:
router.delete('/post/:postId', verifyAccessToken, feedController.deletePost);

module.exports = router;
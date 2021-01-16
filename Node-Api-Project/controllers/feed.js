const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');

const Post = require('../models/post');
const User = require('../models/user');
const { getIO } = require('../socket');

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find().populate('creator').sort({createdAt: -1}).skip((currentPage - 1) * perPage).limit(perPage);
    res.status(200).json({ posts: posts, totalItems: totalItems });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  };
};

exports.getSinglePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if(!post) {
      const error = new Error('Could not find post!');
      error.statusCode = 404;
      throw error;
    }
    const user = await User.findById(post.creator);
    res.status(200).json({ message: 'Post fetched', post: post, creator: user.name });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  };
};

exports.createPost = async (req, res, next) => {
  let creator;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed! Entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  if (!req.file) {
    const error = new Error('No image provided!');
    error.statusCode = 422;
    // console.log('63: File not found');
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  const imageUrl = req.file.path.replace("\\","/");
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId
  });
  await post.save();
  try {
    const user = await User.findById(req.userId);
    creator = user;
    user.posts.push(post);
    await user.save();
    getIO().emit('posts', { action: 'create', post: {...post._doc, creator: {_id: user._id, name: user.name }} });
    res.status(201).json(
      {
        message: 'Post created successfully!',
        post: post,
        creator: { _id: creator._id, name: creator.name }
      }
    ); 
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  };
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed! Entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path.replace('\\','/');
  }
  if (!imageUrl) {
    const error = new Error('No file picked!');
    error.statusCode = 422;
    throw error; 
  }
  try {
    const post = await Post.findById(postId).populate('creator');
    if(!post) {
      const error = new Post('No such post Found!');
      error.statusCode = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error('Not authorized!');
      error.statusCode = 403;
      throw error;
    }
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }
    post.imageUrl = imageUrl;
    post.title = title;
    post.content = content;
    post.save();
    getIO().emit('posts', { action: 'update', post: post });
    res.status(200).json({ message: 'Post updated successfully!', post: post });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  };
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new error('Post not Found!');
      error.statusCode = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error('Not authorized!');
      error.statusCode = 403;
      throw error;
    }
    if (post.imageUrl) {
      clearImage(post.imageUrl);
    }
    await Post.findByIdAndRemove(postId);
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    user.save();
    getIO().emit('posts', { action: 'delete' });
    res.status(200).json({ message: 'Post deleted successfully.'});
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  };
};

// Function to delete image from the storage:
const clearImage = filepath => {
  const filePath = path.join(__dirname, '..', filepath);
  fs.unlink(filePath, err => {
    console.log(err);
  })
};
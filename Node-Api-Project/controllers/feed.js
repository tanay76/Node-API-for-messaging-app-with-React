const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');

const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  let totalItems;
  Post.find().countDocuments()
  .then(count => {
    totalItems = count;
    return Post.find()
    .populate('creator')
    .skip((currentPage - 1) * perPage)
    .limit(perPage)
  })
  .then(posts => {
    res.status(200).json({ posts: posts, totalItems: totalItems });
  })
  .catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }); 
};

exports.getSinglePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
  .then(post => {
    if(!post) {
      const error = new Error('Could not find post!');
      error.statusCode = 404;
      throw error;
    }
    return User.findById(post.creator)
    .then(user => {
      res.status(200).json({ message: 'Post fetched', post: post, creator: user.name });
    })
  })
  .catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  });
};

exports.createPost = (req, res, next) => {
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
    console.log('63: File not found');
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
  post.save()
  .then(result => {
    return User.findById(req.userId)
    .then(user => {
      creator = user;
      user.posts.push(post);
      return user.save();
    })
    .then(result => {
      res.status(201).json(
        {
          message: 'Post created successfully!',
          post: post,
          creator: { _id: creator._id, name: creator.name }
        }
      ); 
    })
  })
  .catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  });
};

exports.updatePost = (req, res, next) => {
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
  Post.findById(postId)
  .then(post => {
    if(!post) {
      const error = new Post('No such post Found!');
      error.statusCode = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
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
    return post.save();
  })
  .then(result => {
    res.status(200).json({ message: 'Post updated successfully!', post: result });
  })
  .catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  });
};

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
  .then(post => {
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
    clearImage(post.imageUrl);
    return Post.findByIdAndRemove(postId);
  })
  .then(result => {
    User.findById(req.userId)
    .then(user => {
      user.posts.pull(postId);
      user.save();
    })
    .then(() => {
      res.status(200).json({ message: 'Post deleted successfully.'});
    })
  })
  .catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  });
};

// Function to delete image from the storage:
const clearImage = filepath => {
  const filePath = path.join(__dirname, '..', filepath);
  fs.unlink(filePath, err => {
    console.log(err);
  })
};
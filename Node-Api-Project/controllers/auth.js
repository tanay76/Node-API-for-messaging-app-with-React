const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

const User = require('../models/user');
const { genAccessToken, genRefreshToken, verifyRefreshToken } = require('../helpers/jwt-helper');

exports.signUp = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty) {
    const error = new Error('Validation failed!');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  bcrypt.hash(password, 12)
  .then(hashedPw => {
    const user = new User({
      name: name,
      email: email,
      password: hashedPw
    });
    return user.save();
  })
  .then(savedUser => {
    res.status(201).json({ message: 'User created', userId: savedUser._id});
  })
  .catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  });
};

exports.logIn = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty) {
    const error = new Error('Validation failed!');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  User.findOne({ email: email })
  .then(user => {
    if (!user) {
      const error = new Error('This email could not be found!');
      error.statusCode = 401;
      throw error;
    }
    loadedUser = user;
    return bcrypt.compare(password, user.password);
  })
  .then(isEqual => {
    if (!isEqual) {
      const error = new Error('Wrong Password!');
      error.statusCode = 401;
      throw error;
    }
    const accessToken = genAccessToken(loadedUser._id, loadedUser.email);
    const refreshToken = genRefreshToken(loadedUser._id, loadedUser.email);
    loadedUser.refreshToken = refreshToken;
    loadedUser.save();
    res.status(200).json({
      token: accessToken,
      expiresIn: '1800s',
      refreshToken: refreshToken,
      userId: loadedUser._id.toString()
    });
  })
  .catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  });
};

exports.refreshToken = (req, res, next) => {
  let savedUser;
  const { refreshToken } = req.body;
  if (!refreshToken) {
    const error = new Error('Bad Request!');
    error.statusCode = 400;
    throw error;
  }
  const userId = verifyRefreshToken(refreshToken);
  User.findOne({_id: userId})
  .then(user => {
    if (!user) {
      const error = new Error('No such User found!');
      error.statusCode = 401;
      throw error;
    }
    if (user.refreshToken != refreshToken) {
      const error = new Error('Not Authenticated!');
      error.statusCode = 422;
      throw error;
    }
    savedUser = user;
    const email = user.email;
    const accessToken = genAccessToken(userId, email);
    const refToken = genRefreshToken(userId, email);
    savedUser.refreshToken = refToken;
    savedUser.save();
    return res.status(200).json({
      token: accessToken,
      expiresIn: '1800s',
      refreshToken: refToken,
      userId: savedUser._id 
    });
  })
  .catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  });
};

exports.getUserStatus = (req, res, next) => {
  User.findById(req.userId)
  .then(user => {
    if (!user) {
      const error = new Error('User not found!');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ status: user.status });
  })
  .catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  });
};

exports.updateUserStatus = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty) {
    const error = new Error('Validation failed!');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const newStatus = req.body.status;
  User.findById(req.userId)
  .then(user => {
    if (!user) {
      const error = new Error('User not found!');
      error.statusCode = 404;
      throw error;
    }
    user.status = newStatus;
    return user.save();
  })
  .then(result => {
    res.status(201).json({ message: 'User Status Updated!' });
  })
  .catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  });
};

exports.logOut = (req, res, next) => {
  let savedUser;
  User.findOne({_id: req.userId})
  .then(user => {
    if (!user) {
      const error = new Error('User not found!');
      error.statusCode = 401;
      throw error;
    }
    savedUser = user;
    savedUser.refreshToken = null;
    savedUser.save();
    res.status(200).json({ accessToken: {}, refreshToken: {}, message: 'Logged Out successfully!', userId: req.userId});
  })
  .catch(err => {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  });
};
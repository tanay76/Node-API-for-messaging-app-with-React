const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

const User = require('../models/user');
const { genAccessToken, genRefreshToken, verifyRefreshToken } = require('../helpers/jwt-helper');

exports.signUp = async (req, res, next) => {
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
  try {
    const hashedPw = await bcrypt.hash(password, 12);
    const user = new User({
      name: name,
      email: email,
      password: hashedPw
    });
    user.save();
    res.status(201).json({ message: 'User created', userId: user._id});
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  };
};

exports.logIn = async (req, res, next) => {
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
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      const error = new Error('This email could not be found!');
      error.statusCode = 401;
      throw error;
    }
    loadedUser = user;
    const isEqual = await bcrypt.compare(password, user.password);
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
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  };
};

exports.refreshToken = async (req, res, next) => {
  let savedUser;
  const { refreshToken } = req.body;
  if (!refreshToken) {
    const error = new Error('Bad Request!');
    error.statusCode = 400;
    throw error;
  }
  const userId = verifyRefreshToken(refreshToken);
  try {
    const user = await User.findOne({_id: userId});
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
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  };
};

exports.getUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User not found!');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ status: user.status });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  };
};

exports.updateUserStatus = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty) {
    const error = new Error('Validation failed!');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const newStatus = req.body.status;
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error('User not found!');
      error.statusCode = 404;
      throw error;
    }
    user.status = newStatus;
    user.save();
    res.status(201).json({ message: 'User Status Updated!' });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  };
};

exports.logOut = async (req, res, next) => {
  try {
    const savedUser = await User.findOne({_id: req.userId});
    if (!savedUser) {
      const error = new Error('User not found!');
      error.statusCode = 401;
      throw error;
    }
    savedUser.refreshToken = null;
    savedUser.save();
    res.status(200).json({ accessToken: {}, refreshToken: {}, message: 'Logged Out successfully!', userId: req.userId});
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  };
};
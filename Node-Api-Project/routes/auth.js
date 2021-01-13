const express = require('express');
const { body } = require('express-validator');
const { verifyAccessToken } = require('../helpers/jwt-helper');

const router = express.Router();

const authController = require('../controllers/auth');
const User = require('../models/user');

router.put('/signup',
 [
   body('name').isString().trim().not().isEmpty(),
   body('email').isEmail().trim().withMessage('Please enter a valid email!')
   .custom((value, { req }) => {
     return User.findOne({ email: value })
     .then(userDoc => {
       if (userDoc) return Promise.reject('Email address already exists!');
     })
   })
   .normalizeEmail(),
   body('password').isString().trim().isLength({ min: 5 })
 ],
  authController.signUp);

router.post('/login',
 [
   body('email').isEmail().trim().normalizeEmail(),
   body('password').isString().trim()
 ],
  authController.logIn);

router.post('/refresh-token', authController.refreshToken);

router.get('/status', verifyAccessToken, authController.getUserStatus);

router.patch('/status', verifyAccessToken, [
  body('status').isString().trim().not().isEmpty()
], authController.updateUserStatus);

router.post('/logout', verifyAccessToken, authController.logOut);

module.exports = router;
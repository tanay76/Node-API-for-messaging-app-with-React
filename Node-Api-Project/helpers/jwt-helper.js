const jwt = require('jsonwebtoken');
require('dotenv').config()

const genAccessToken = (userId, email) => {
    const payload = {
    userId : userId,
    email: email
  };
  const secretKey = process.env.ACCESS_KEY;
  // console.log(secretKey);
  const options = { expiresIn: '1800s' };
  const accessToken = jwt.sign(payload, secretKey, options);
  if (!accessToken) {
    const error = new Error('Internal Server Error!');
    error.statusCode = 500;
    throw error;
  }
  return accessToken;
};

const verifyAccessToken = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader) {
    const error = new Error('Not Authenticated');
    error.statusCode = 401;
    throw error;
  }
  const accessToken = authHeader.split(' ')[1];
  jwt.verify(accessToken, process.env.ACCESS_KEY, (err, payload) => {
    if (err) {
      err.message = 'Not Authenticated. Access token might have expired!';
      err.statusCode = 401;
      throw err;
    }
    req.userId = payload.userId;
    next();
  });
};

const genRefreshToken = (userId, email) => {
  const payload = {
    userId : userId,
    email: email
  };
  const secretKey = process.env.REFRESH_KEY;
  // console.log(secretKey);
  const options = {};
  const refreshToken = jwt.sign(payload, secretKey, options);
  if (!refreshToken) {
    const error = new Error('Internal Server Error!');
    error.statusCode = 500;
    throw error;
  }
  return refreshToken;
};

const verifyRefreshToken = (refreshToken) => {
  const payload = jwt.verify(refreshToken, process.env.REFRESH_KEY);
    if (!payload) {
      const error = new Error('Validation failed/ Refresh token must have Expired!');
      error.statusCode = 422;
      throw error;
    }
    const userId = payload.userId;
    return userId;
};

module.exports = {
  genAccessToken, genRefreshToken, verifyAccessToken, verifyRefreshToken
};
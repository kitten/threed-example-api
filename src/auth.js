const jwt = require('jsonwebtoken');
const constants = require('./constants');

const create = user => {
  return jwt.sign({
    id: user.id || '',
    username: user.username || ''
  }, constants.JWT_SECRET);
};

const middleware = (req, res, next) => {
  const authorization = req.get('authorization');
  if (!authorization || !authorization.startsWith('Bearer')) {
    next();
  } else {
    const token = authorization.split(' ')[1] || '';

    jwt.verify(token, constants.JWT_SECRET, (err, decoded) => {
      if (!err && decoded) {
        req.user = decoded;
      } else if (err) {
        console.error(err);
      }

      next();
    });
  }
};

module.exports = { create, middleware };

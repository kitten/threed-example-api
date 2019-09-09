const jwt = require('jsonwebtoken');

const { JWT_SECRET = 'threed-secret-123' } = process.env;

const create = user => {
  return jwt.sign({
    id: user.id || '',
    username: user.username || ''
  }, JWT_SECRET);
};

const middleware = (req, res, next) => {
  const authorization = req.get('authorization');
  const token = authorization.split(' ')[1] || '';

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (!err && decoded) {
      req.user = decoded;
    } else if (err) {
      console.error(err);
    }

    next();
  });
};

module.exports = { create, middleware };

const jwt = require('jsonwebtoken');

// set 'req.userId' from token in authorization header
module.exports = (req, res, next) => {
  const authInHeader = req.get('Authorization');
  if(!authInHeader) {
    const error = new Error('Not authenticated');
    error.statusCode = 401;
    throw error;
  }
  const token = authInHeader.replace('Bearer ', '');  // strip out 'Bearer '
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    err.statusCode = 500;   // e.g. err.message = 'jwt malformed'
    throw err;
  }
  if(!decodedToken) {
    const error = new Error('Not authenticated');
    error.statusCode = 401;
    throw error;
  }
  req.userId = decodedToken.userId;
  next();
};

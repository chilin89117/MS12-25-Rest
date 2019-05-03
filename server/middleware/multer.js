const multer = require('multer');
const _ = require('lodash');

// Multer option for file types to accept
const fileFilter = (req, file, cb) => {
  cb(null, _.includes(['image/png', 'image/jpg', 'image/jpeg'], file.mimetype));
};

// Multer option for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'images'),
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`)
});
 
module.exports = multer({storage, fileFilter});

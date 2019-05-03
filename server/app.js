require('dotenv').config();
const path = require('path');

// express
const express = require('express');
const app = express();
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images')));

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// multer
const upload = require('./middleware/multer');
app.use(upload.single('image'));

// routes
const authRouter = require('./routes/authRoutes');
const feedRouter = require('./routes/feedRoutes');
app.use('/feed', feedRouter);
app.use('/auth', authRouter);

// error handler
app.use((err, req, res, next) => {
  console.log('========== app.js error handler ==========\n', err.message);
  const errStatus = err.statusCode || 500;
  const errMsg = err.message;
  const errData = err.data;
  res.status(errStatus).json({errMsg, errData});
});

// start server & socket.io after connecting to database
const mongoose = require('mongoose');
const port = process.env.PORT || 4000;
mongoose
  .connect(process.env.MONGOURI, {useNewUrlParser: true, poolSize: 5})
  .then(result => {
    const server = app.listen(port, () => console.log(`MS12-25-Rest on port ${port}...`));
    const io = require('./socket').init(server);
    io.on('connection', socket => console.log('client connected'));
  })
  .catch(err => next(err));

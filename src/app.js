#!/usr/bin/node
const express = require('express');
const createError = require('http-errors');
const path = require('path');
const { fileURLToPath } = require('url');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const usersRouter = require('./routes/users');
const indexRouter = require('./routes/index');

const datasource = require('./data_source');
require('./init_redis');

// express main app route initializer
const app = express();

// intialize mysql database connection
datasource.initialize()
  .then(() => {
    console.log('Connected to mysql database');
  })
  .catch((error) => console.log('Error when trying to set up database connection: ', error));

// Get file name
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);


app.use(logger('dev'));
// Verify that the incoming request is in JSON format
app.use(express.json({
  verify: async (req, res, buffer, encoding) => {
    try {
      await JSON.parse(buffer);
    } catch (error) {
      return res.status(400).json({ "status": "Not a JSON" });
    }
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

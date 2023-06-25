#!/usr/bin/node
import express from 'express';
import createError from 'http-errors';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import logger from 'morgan';

import usersRouter from './routes/users.js';
import indexRouter from './routes/index.js';

import { datasource } from './data_source.js';


export const app = express();

// intialize database connection
datasource.initialize()
  .then(() => {
    console.log('Connected to the database');
  })
  .catch((error) => console.log('Error when trying to set up database connection: ', error));

// Get file name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

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



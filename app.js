var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var toursRouter = require('./routes/tours');

var requestMetrics = require('./middleware/requestMetrics');
var requestStats = require('./middleware/requestStats');

require('./subscribers/requestSubscriber');

var app = express();

// view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// middleware
app.use(requestMetrics);
app.use(requestStats);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// routes
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/tours', toursRouter);

// 404
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  console.log("ERROR:", err.message);

  res.status(err.status || 500).send(err.message);
});

module.exports = app;
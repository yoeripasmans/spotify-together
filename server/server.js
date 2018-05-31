var express = require('express');
var dotenv = require('dotenv').load();

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var routes = require('./routes')(io);
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var methodOverride = require('method-override');
var session = require('express-session');
var passport = require('passport');
var db = require('./models/index');

// view engine setup
app.set('views', 'server/views');
app.set('view engine', 'ejs');
app.set('socketio', io);

app.use(express.json());
app.use(express.urlencoded({
	extended: false
}));

app.use(express.static('public'));

app.use(cookieParser());
app.use(methodOverride());

app.use(session({
  secret: 'keyboard cat',
  resave: true,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', routes);

http.listen(process.env.PORT, function() {
	console.log('Listening on port:', process.env.PORT);
});

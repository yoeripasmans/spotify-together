var express = require('express');
var dotenv = require('dotenv').load();
var routes = require('./routes');
var passport = require('passport');
var db = require('./models/index');
var app = express();

// view engine setup
app.set('views', 'server/views');
app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', routes);

app.listen(process.env.PORT, function() {
	console.log('Listening on port:', process.env.PORT);
});

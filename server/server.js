var express = require('express');
var routes = require('./routes');
var app = express();
var dotenv = require('dotenv').load();
var db = require('./models/index');

// view engine setup
app.set('views', 'server/views');
app.set('view engine', 'ejs');

app.use(express.static('public'));

app.use('/', routes);

app.listen(process.env.PORT, function() {
	console.log('Listening on port:', process.env.PORT);
});

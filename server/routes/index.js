var express = require('express');
var router = express.Router();
var passport = require('passport');
var auth = require('../auth').auth();

router.get('/', function(req, res) {
	res.render('index');
});

router.get('/login',
	passport.authenticate('spotify', {
		scope: ['streaming user-read-birthdate user-read-private user-read-email user-read-playback-state user-modify-playback-state user-top-read'],
		showDialog: false
	}),
	function(req, res) {
		// The request will be redirected to spotify for authentication, so this
		// function will not be called.
	});

router.get('/callback',
	passport.authenticate('spotify', {
		failureRedirect: '/'
	}),
	function(req, res) {
		res.redirect('/playlist');
	});

router.get('/playlist', ensureAuthenticated, function(req, res) {
	res.render('playlist');
});

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		console.log('auth');
		
		return next();
	} else {
		res.redirect('/');
		console.log('not auth');
	}


}

module.exports = router;

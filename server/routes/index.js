var express = require('express');
var router = express.Router();
var passport = require('passport');
var auth = require('../auth').auth();
var refresh = require('passport-oauth2-refresh');
var SpotifyWebApi = require('spotify-web-api-node');
var Playlists = require('../models/playlist');

var spotifyApi = new SpotifyWebApi();

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

router.get('/playlist', ensureAuthenticated, function(req, res, next) {
	// spotifyApi.setAccessToken(req.user.accessToken);
	// function getMyTopTracks() {
	// 	//Get users top tracks and save it in variable
	// 	spotifyApi.getMyTopTracks()
	// 		.then(function(data) {
	// 			topTracks = data.body.items;
	// 			console.log(topTracks);
	// 		}).then(function(data) {
	// 			res.render('playlist');
	// 		}).catch(function(error) {
	// 			checkAccesToken(req, res, next, error, getMyTopTracks);
	// 		});
	// }
	//
	// getMyTopTracks();

	Playlists.find({}).then(function(results) {
		res.render('playlists-overview', {
			playlists: results
		});
	}).catch(function(error) {
		console.log(error);
	});


});

router.get('/playlist/:id', ensureAuthenticated, function(req, res) {
	Playlists.find({
		id: req.params.id
	}).then(function(results) {

		console.log(results);
		res.render('playlist');
	}).catch(function(err){
		console.log(err);
	});
});

router.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	} else {
		res.redirect('/');
	}
}

function checkAccesToken(req, res, next, error, callback) {
	if (error.statusCode === 401) {
		// Access token expired.
		// Try to fetch a new one.
		refresh.requestNewAccessToken('spotify', req.user.refreshToken, function(err, accessToken) {
			if (err || !accessToken) {
				console.log('no accestoken');
			}
			spotifyApi.setAccessToken(accessToken);
			// Save the new accessToken for future use
			req.user.save({
				accessToken: accessToken
			}, function() {
				// Retry the request.
				callback();
			});
		});

	} else {
		return next();
		// There was another error, handle it appropriately.
	}

}

module.exports = router;

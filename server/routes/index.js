var express = require('express');
var router = express.Router();
var passport = require('passport');
var auth = require('../auth').auth();
var refresh = require('passport-oauth2-refresh');
var SpotifyWebApi = require('spotify-web-api-node');
var Playlist = require('../models/playlist');

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
		res.redirect('/playlists');
	});


router.get('/playlists', ensureAuthenticated, function(req, res, next) {
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

	Playlist.find({}).then(function(results) {
		res.render('overview', {
			playlists: results
		});
	}).catch(function(error) {
		console.log(error);
	});


});

router.get('/playlist/:id', ensureAuthenticated, function(req, res) {
	Playlist.findOne({
		_id: req.params.id
	}).then(function(results) {
		res.render('playlist', {
			playlistData: results
		});
	}).catch(function(err) {
		console.log(err);
	});
});

router.get('/create', ensureAuthenticated, function(req, res) {
	res.render('create');
});

router.post('/create', ensureAuthenticated, function(req, res) {
	console.log(req.user);
	new Playlist({
		name: req.body.name,
		description: req.body.description,
	}).save();

	res.redirect('playlists');
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

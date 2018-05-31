var express = require('express');
var router = express.Router();
var passport = require('passport');
var auth = require('../auth').auth();
var refresh = require('passport-oauth2-refresh');
var SpotifyWebApi = require('spotify-web-api-node');
var Playlist = require('../models/playlist');
var User = require('../models/user');
var spotifyApi = new SpotifyWebApi();

var returnRouter = function(io) {

	router.get('/', function(req, res) {
		res.render('index');
	});
	 let socket_id = [];



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
			// io.on('connection', function(socket) {
			// 	io.removeAllListeners();
			// 	console.log('a user connected: ' + req.user.spotifyId);
			//
			// 	socket.on('disconnect', function(socket) {
			// 		console.log('a user disconnected: ' + req.user.spotifyId);
			// 	});
			// });
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
		// io.on('connection', function(socket) {
		//
		// 	socket.leaveAll();
		// 	console.log('leave',socket.adapter.rooms);
		// 	socket.emit('leaveroom');
		//
		// });

		Playlist.find({}).then(function(results) {
			res.render('overview', {
				playlists: results
			});
		}).catch(function(error) {
			console.log(error);
		});


	});

	router.get('/playlist/:id', ensureAuthenticated, function(req, res, next) {

		io.on('connection', function(socket) {
			io.removeAllListeners('connection');
			console.log('connect');

			// io.sockets.emit('showsocket', socket);
			socket.userid = req.user.spotifyId;
			console.log('spotify id',socket.userid);
			console.log('id',socket.id);
			socket.join(req.params.id);
			// io.to(req.params.id).emit('joinroom', req.params.id);
			console.log('current roooms', socket.adapter.rooms);
			socket.on('disconnect', function(socket) {
				// console.log('a user disconnected: ' + req.user.spotifyId);
				// io.sockets.connected[socket.id].disconnect();
				console.log('rooms after disconnect', socket.adapter);
				console.log('disconnect');
			});
		});

		//Set acces token
		spotifyApi.setAccessToken(req.user.accessToken);

		//Get playlist from database
		Playlist.findOne({
			_id: req.params.id
		}).then(function(results) {
			var tracks = results.tracks;

			if (tracks.length > 0) {
				getTracks();
			} else {
				res.render('playlist', {
					playlistData: results
				});
			}
			//Get track details from playlist
			function getTracks() {
				spotifyApi.getTracks(tracks).then(function(data) {
					return data.body;
				}).then(function(trackData) {
					res.render('playlist', {
						playlistData: results,
						trackData: trackData.tracks,
					});
				}).catch(function(error) {
					//Refresh acces token if error
					checkAccesToken(req, res, next, error, getTracks);
				});
			}

		}).catch(function(err) {
			console.log(err);
		});
	});

	router.get('/create', ensureAuthenticated, function(req, res) {
		res.render('create');
	});

	router.post('/create', ensureAuthenticated, function(req, res) {
		new Playlist({
			name: req.body.name,
			image: req.body.image,
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
			refresh.requestNewAccessToken('spotify', req.user.refreshToken, function(err, newAccessToken) {
				if (err || !newAccessToken) {
					console.log('no accestoken');
				}
				User.update({
					spotifyId: req.user.spotifyId
				}, {
					accessToken: newAccessToken
				});
				spotifyApi.setAccessToken(newAccessToken);
				// Save the new accessToken for future use
				req.user.save({
					accessToken: newAccessToken
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
	return router;
};

module.exports = returnRouter;

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

	router.get('/login',
		passport.authenticate('spotify', {
			scope: ['streaming user-read-birthdate user-read-private playlist-read-private user-read-email user-read-playback-state user-modify-playback-state user-top-read'],
			showDialog: false
		}),
		function(req, res) {
			// The request will be redirected to spotify for authentication, so this function will not be called.
		});

	router.get('/callback',
		passport.authenticate('spotify', {
			failureRedirect: '/'
		}),
		function(req, res, next) {
			res.redirect('/playlists');
		});


	router.get('/playlists', ensureAuthenticated, function(req, res, next) {

		Playlist.find({}).sort({
			createdAt: 'desc'
		}).then(function(results) {
			res.render('overview', {
				playlists: results,
				user: req.user
			});
		}).catch(function(error) {
			console.log(error);
		});


	});

	router.get('/playlist/:id', ensureAuthenticated, function(req, res, next) {

		io.on('connection', function(socket) {
			//Remove listeners
			io.removeAllListeners('connection');
			//Join room
			if(req.params.id != undefined){
			socket.join(req.params.id);
			}
			socket.emit('connected');
			//See who connected
			console.log(req.user.spotifyId, 'Connected');
			//Update database with adding active user to database
			var currentUser = {
				"id": req.user.spotifyId,
				"name": req.user.username,
				"profilePic": req.user.profilePic
			};

			Playlist.update({
					"_id": req.params.id,
					'activeUsers.id': {
						$ne: currentUser.id
					}
				}, {
					"$push": {
						"activeUsers": currentUser,
						"users": currentUser,
					}
				},
				function(err, raw) {
					if (err) {
						console.log(err);
					} else {
						//Get playlist from database
						Playlist.findOne({
							_id: req.params.id
						}).then(function(results) {
							var activeUsers = results.activeUsers;
							socket.emit('showActiveUsers', activeUsers);
							socket.broadcast.to(req.params.id).emit('joinPlaylist', currentUser, activeUsers);
						}).catch(function(err) {
							console.log(err);
						});
					}

				});

			socket.on('ShowAddTracks', function() {
				spotifyApi.setAccessToken(req.user.accessToken);

				function getTopTracks() {
					spotifyApi.getMyTopTracks()
						.then(function(data) {
							topTracks = data.body.items;
							console.log(topTracks);
							socket.emit('ShowAddTracks', topTracks);
						}).catch(function(err) {
							checkAccesToken(req, res, next, err, getTopTracks);
						});
				}
				getTopTracks();
				console.log('add track');
			});

			socket.on('addTrack', function(trackData) {
				console.log(trackData);
				Playlist.update({
						_id: req.params.id
					}, {
						$push: {
							tracks: {
								id: trackData.id,
								uri: trackData.uri,
								name: trackData.name,
								artists: trackData.artists,
								album: trackData.album,
								duration_ms: trackData.duration_ms,
								likes: 0,
								addedBy: req.user.spotifyId,
							}
						}
					},
					function(err, raw) {
						if (err) {
							console.log(err);
						} else {
							io.to(req.params.id).emit('addTrack', trackData);
						}
					});
			});

			socket.on('disconnect', function(socket) {
				Playlist.update({
						"_id": req.params.id
					}, {
						"$pull": {
							"activeUsers": currentUser,
							"users": currentUser,
						}
					},
					function(err, raw) {
						if (err) {
							console.log(err);
						} else {
							Playlist.findOne({
								_id: req.params.id
							}).then(function(results) {
								var activeUsers = results.activeUsers;
								io.to(req.params.id).emit('leavePlaylist', currentUser, activeUsers);
							}).catch(function(err) {
								console.log(err);
							});
						}
					});
				// console.log('rooms after disconnect', socket.adapter);
				console.log('Disconnected');
			});
		});

		//Get playlist from database
		Playlist.findOne({
			_id: req.params.id
		}).then(function(results) {
			// var tracks = results.tracks;
			// console.log(tracks);
			// if(tracks.length > 0) {
			// 	getTracks();
			// } else {
			res.render('playlist', {
				playlistData: results,
				user: req.user
			});


			// function getTopTracks() {
			// 	spotifyApi.getMyTopTracks()
			// 		.then(function(data) {
			// 			topTracks = data.body.items;
			// 			console.log(topTracks);
			//
			// 		}).catch(function(err) {
			// 			checkAccesToken(req, res, next, err, getTopTracks);
			// 		});
			// }
			// getTopTracks();
			// }
			// //Get track details from playlist
			// function getTracks() {
			// 	spotifyApi.getTracks(tracks).then(function(data) {
			// 		return data.body;
			// 	}).then(function(trackData) {
			// 		res.render('playlist', {
			// 			playlistData: results,
			// 			trackData: trackData.tracks,
			// 		});
			// 	}).catch(function(error) {
			// 		//Refresh acces token if error
			// 		console.log(error);
			// 		checkAccesToken(req, res, next, error, getTracks);
			// 	});
			// }

		}).catch(function(err) {
			console.log(err);
		});
	});

	router.get('/create', ensureAuthenticated, function(req, res) {
		res.render('create', {user: req.user});
	});

	router.post('/create', ensureAuthenticated, function(req, res) {
		new Playlist({
			name: req.body.name,
			image: req.body.image,
			description: req.body.description,
			restrictions: req.body.restrictions,
			private: req.body.private,
			password: req.body.password,
			users: req.user.spotifyId,
			admins: req.user.spotifyId,
			createdBy: req.user.spotifyId,
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

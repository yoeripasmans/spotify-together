var express = require('express');
var router = express.Router();
var passport = require('passport');
var auth = require('../auth').auth();
var refresh = require('passport-oauth2-refresh');
var fetch = require('node-fetch');
var SpotifyWebApi = require('spotify-web-api-node');
var Playlist = require('../models/playlist');
var User = require('../models/user');
var crypto = require("crypto");
var spotifyApi = new SpotifyWebApi();

var returnRouter = function(io) {

	router.get('/', function(req, res) {
		// res.render('index');
		res.redirect('/login');
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
	//If playlist gets QR scanned link directly to playlist
	router.get('/playlist/:qr/:id', ensureAuthenticated, function(req, res, next) {
		res.redirect('/playlist/' + req.params.id);
	});

	router.get('/playlist/:id', ensureAuthenticated, function(req, res, next) {

		io.on('connection', function(socket) {
			//Remove listeners to prevent multiple connections on refresh
			io.removeAllListeners('connection');
			//Join room
			socket.join(req.params.id);
			//Emit 'connected' to socket
			socket.emit('connected');
			//Logs who connected
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

			socket.on('addTrack', function(trackData) {

				var newTrackData = {
					id: trackData.id,
					uri: trackData.uri,
					name: trackData.name,
					artists: trackData.artists,
					album: trackData.album,
					duration_ms: trackData.duration_ms,
					likes: 0,
					addedBy: req.user.spotifyId,
					isPlaying: false
				};

				Playlist.findOneAndUpdate({
						_id: req.params.id
					}, {
						$push: {
							tracks: {
								$each: [newTrackData],
								$sort: {
									isPlaying: -1,
									likes: -1,
									createdAt: 1
								}
							}
						},

					}, {
						upsert: true,
						new: true
					},
					function(err, docs) {
						if (err) {
							console.log(err);
						} else {
							var databaseTrackData = docs.tracks[docs.tracks.length - 1];
							io.to(req.params.id).emit('addTrack', databaseTrackData);
						}
					});
			});

			socket.on('likeTrack', function(trackId) {
				Playlist.findOneAndUpdate({
						"_id": req.params.id,
						"tracks._id": trackId
					}, {
						"$inc": {
							"tracks.$.likes": 1
						},
						"$push": {
							"tracks.$.userLiked": req.user.spotifyId
						}


					},
					function(err, doc) {
						if (err) {
							console.log(err);
						} else {
							Playlist.update({
									_id: req.params.id
								}, {
									$push: {
										tracks: {
											$each: [],
											$sort: {
												isPlaying: -1,
												likes: -1,
												createdAt: 1
											}
										}
									},
								}, {
									new: true
								},
								function(err, docs) {
									if (err) {
										console.log(err);
									} else {
										io.to(req.params.id).emit('likeTrack', trackId, docs);
									}
								});



						}
					});
			});

			socket.on('deleteTrack', function(trackId) {
				console.log(trackId);
				Playlist.findOneAndUpdate({
						_id: req.params.id,
						"tracks._id": trackId
					}, {
						$pull: {
							"tracks": {
								"_id": trackId
							}
						},

					}, {
						upsert: true,
						new: true
					},
					function(err, docs) {
						if (err) {
							console.log(err);
						} else {
							io.to(req.params.id).emit('deleteTrack', trackId);
						}
					});
			});

			socket.on('playTrack', function() {
				//Set accestoken
				spotifyApi.setAccessToken(req.user.accessToken);

				Playlist.findOne({
					_id: req.params.id
				}).then(function(results) {

					//Save currentTrack and set playing to true
					var currentTrack = results.tracks[0];
					currentTrack.set('isPlaying', true);

					//Save to database and play track
					results.save().then(function(savedPost) {
						io.to(req.params.id).emit('playingTrack', currentTrack);
						playTrack();
						console.log(savedPost);
					}).catch(function(err) {
						console.log(err);
					});
					console.log(req.user.spotifyId);

					function playTrack() {
						console.log('Accestoken', req.user.accessToken);
						spotifyApi.play({
								uris: [currentTrack.uri]
							})
							.then(function(data) {}).catch(function(err) {
								console.log('play function', err);
								checkAccesToken(req, res, next, err, playTrack);
							});
					}

				}).catch(function(err) {
					console.log(err);
				});



			});

			socket.on('searchTrack', function(value) {
				spotifyApi.setAccessToken(req.user.accessToken);

				function searchTrack() {
					spotifyApi.searchTracks(value)
						.then(function(data) {
							socket.emit('searchTrack', data.body.tracks.items);
						}, function(err) {
							console.error(err);
							searchTrack(req, res, next, err, searchTrack);
						});
				}
				searchTrack();
			});

			socket.on('fetchDevices', function() {
				spotifyApi.setAccessToken(req.user.accessToken);

				function fetchDevices() {
					spotifyApi.getMyDevices()
						.then(function(data) {
							var devices = data.body.devices;
							socket.emit('showDevices', devices);
						}).catch(function(err) {
							console.log(err);
							checkAccesToken(req, res, next, err, fetchDevices);
						});
				}
				fetchDevices();
			});

			socket.on('transferDevicePlayback', function(device) {
				spotifyApi.setAccessToken(req.user.accessToken);

				function transferDevicePlayback() {
					spotifyApi.transferMyPlayback({
							deviceIds: [device.id],
							play: true
						})
						.then(function(data) {
							console.log('transferd');
						}).catch(function(err) {
							console.log(err);
							checkAccesToken(req, res, next, err, transferDevicePlayback);
						});
				}
				transferDevicePlayback();
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
			var topTracks;
			var userPlaylists;
			spotifyApi.setAccessToken(req.user.accessToken);

			function getUserTopTracks() {
				spotifyApi.getMyTopTracks()
					.then(function(data) {
						topTracks = data.body.items;
						getUserPlaylist();
					}).catch(function(err) {
						console.log(err);
						checkAccesToken(req, res, next, err, getUserTopTracks);
					});
			}

			function getUserPlaylist() {
				spotifyApi.getUserPlaylists(req.user.spotifyId)
					.then(function(data) {
						var userPlaylists = data.body.items;
						console.log('Retrieved playlists', data.body.items);
						res.render('playlist', {
							playlistData: results,
							user: req.user,
							topTracks: topTracks,
							userPlaylists: userPlaylists
						});

					}).catch(function(err) {
						console.log(err);
						checkAccesToken(req, res, next, err, getUserPlaylist);
					});
			}

			getUserTopTracks();

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
		res.render('create', {
			user: req.user
		});
	});

	router.post('/create', ensureAuthenticated, function(req, res) {
		//Create QR code id
		var id = crypto.randomBytes(8).toString('hex');
		//Checkboxes
		if (req.body.private === undefined) {
			req.body.private = false;
		} else {
			req.body.private = true;
		}

		if (req.body.restricted === undefined) {
			req.body.restricted = false;
		} else {
			req.body.restricted = true;
		}

		new Playlist({
			name: req.body.name,
			image: req.body.image,
			description: req.body.description,
			restricted: req.body.restricted,
			private: req.body.private,
			password: req.body.password,
			users: req.user.spotifyId,
			admins: req.user.spotifyId,
			createdBy: req.user.spotifyId,
			qrCodeId: id
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
				console.log('user', req.user.spotifyId);
				console.log('new acces token', newAccessToken);

				//Update token in database
				User.findOneAndUpdate({
					"spotifyId": req.user.spotifyId
				}, {
					$set: {
						"accessToken": newAccessToken
					}
				}, function(err, raw) {
					if (err) {
						console.log(err);
					} else {
						console.log('raw', raw);
					}
				});


				spotifyApi.setAccessToken(newAccessToken);
				// req.session.passport.user.accessToken = newAccessToken;
				// req.session.save(function(err) {
				// 	console.log(err);
				// });

				// Save the new accessToken for future use
				req.user.save({
					accessToken: newAccessToken
				}, function() {
					// Retry the request.
					callback();
				});
			});

		} else {
			console.log('refresh function', error);
			return next();
			// There was another error, handle it appropriately.
		}

	}
	return router;
};

module.exports = returnRouter;

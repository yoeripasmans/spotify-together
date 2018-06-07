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

			socket.on('showAddTracks', function() {
				spotifyApi.setAccessToken(req.user.accessToken);
				function getTopTracks() {
					spotifyApi.getMyTopTracks()
						.then(function(data) {
							topTracks = data.body.items;
							console.log(topTracks);
							socket.emit('showAddTracks', topTracks);
						}).catch(function(err) {
							checkAccesToken(req, res, next, err, getTopTracks);
						});
				}
				getTopTracks();
				console.log('add track');
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
				};
				console.log(trackData);
				Playlist.findOneAndUpdate({
						_id: req.params.id
					}, {
						$push: {
							tracks: {
								$each: [newTrackData],
								$sort: {
									likes: -1,
									createdAt: 1
								}
							}
						},

					},{upsert: true,new:true},
					function(err, docs) {
						if (err) {
							console.log(err);
						} else {
							console.log(docs);
							io.to(req.params.id).emit('addTrack', newTrackData);
						}
					});
			});

			socket.on('requestPlayTrack', function() {
				Playlist.findOne({
					_id: req.params.id
				}).then(function(results) {
					// console.log(results);
					var firstTrack = results.tracks[0].uri;
					console.log(req.user.spotifyId);
					io.to(req.params.id).emit('requestPlayTrack', firstTrack, req.user);
					// playTrack(firstTrack);
				}).catch(function(err) {
					console.log(err);
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
												likes: -1,
												createdAt: 1
											}
										}
									},
								},{new:true},
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

					},{upsert: true,new:true},
					function(err, docs) {
						if (err) {
							console.log(err);
						} else {
							console.log(docs);
							io.to(req.params.id).emit('deleteTrack', trackId);
						}
					});
			});

			socket.on('playTrack', function() {
				spotifyApi.setAccessToken(req.user.accessToken);

				Playlist.findOne({
					_id: req.params.id
				}).then(function(results) {
					// console.log(results);
					var firstTrack = results.tracks[0].uri;
					console.log(req.user.spotifyId);
					// playTrack(firstTrack);
				}).catch(function(err) {
					console.log(err);
				});

				// function playTrack(track) {
				// 	spotifyApi.play({
				// 			uris: [track]
				// 		})
				// 		.then(function(data) {}).catch(function(err) {
				// 			console.log(err);
				// 			checkAccesToken(req, res, next, err, playTrack);
				// 		});
				// }

			});

			socket.on('fetchDevices', function() {
				spotifyApi.setAccessToken(req.user.accessToken);

				function fetchDevices() {
					spotifyApi.getMyDevices()
						.then(function(data) {
							var devices = data.body.devices;
							socket.emit('showDevices', devices);
						}).catch(function(err) {

							checkAccesToken(req, res, next, err, fetchDevices);
						});
				}
				fetchDevices();
			});

			socket.on('transferDevicePlayback', function(device) {

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
		res.render('create', {
			user: req.user
		});
	});

	router.post('/create', ensureAuthenticated, function(req, res) {
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

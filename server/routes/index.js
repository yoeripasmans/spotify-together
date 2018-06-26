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
var Vibrant = require('node-vibrant');

var returnRouter = function(io) {

	router.get('/', function(req, res) {
		// res.render('index');
		res.redirect('/login');
	});

	// router.get('/login', function(req, res, next) {
	//
	// 	passport.authenticate('spotify', {
	// 		state: req.session.playlistId
	// 	}, {
	// 		scope: ['streaming user-read-birthdate user-read-private playlist-read-private user-read-email user-read-playback-state user-modify-playback-state user-top-read'],
	// 		showDialog: true
	// 	});
	//
	//
	// });

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
			console.log(req.session.playlistId);
			// if (req.session.playlistId !== null) {
			// 	res.redirect('/playlist/' + req.session.playlistId);
			// } else {
			// 	res.redirect('/playlists');
			// }
					res.redirect('/playlists');

		});


	router.get('/playlists', ensureAuthenticated, function(req, res, next) {
		req.session.playlistId = null;
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
	router.get('/playlist/:qr/:id', function(req, res, next) {
		var playlistId = req.params.id;
		req.session.playlistId = playlistId;
		console.log(req.session.playlistId);
		res.redirect('/playlist/' + playlistId);

	});

	var timeouts = {};
	var intervals = {};

	router.get('/playlist/:id', ensureAuthenticated, function(req, res, next) {
		var playlistId = req.params.id;
		//Save current playlist id inside session
		req.session.playlistId = playlistId;
		if (req.params !== 'undefined' && req.params.id !== 'undefined') {

			io.on('connection', function(socket) {
				//Remove listeners to prevent multiple connections on refresh
				io.removeAllListeners('connection');

				socket.on('connected', function() {
					//Join room with the parameter of the url
					socket.join(playlistId);
					//Emit 'connected' to socket with user object
					socket.emit('connected', req.user);
					//Logs who connected
					console.log(req.user.spotifyId, 'Connected');

					//Update database with adding active user to database
					Playlist.update({
							"_id": playlistId,
							'activeUsers.spotifyId': {
								$ne: req.user.spotifyId
							}
						}, {
							"$push": {
								"activeUsers": req.user,
								"users": req.user,
							}
						},
						function(err, raw) {
							if (err) {
								console.log(err);
							} else {
								//Get playlist from database
								Playlist.findOne({
									_id: playlistId
								}).then(function(results) {
									var activeUsers = results.activeUsers;
									socket.emit('showActiveUsers', activeUsers);
									socket.broadcast.to(playlistId).emit('joinPlaylist', req.user, activeUsers);
								}).catch(function(err) {
									console.log(err);
								});
							}

						});

				});

				socket.on('disconnect', function() {
					console.log(req.user.spotifyId, 'Disconnected');
					socket.leave(playlistId);

					Playlist.update({
							"_id": playlistId
						}, {
							"$pull": {
								"activeUsers": req.user,
								"users": req.user
							}
						},
						function(err, raw) {
							if (err) {
								console.log(err);
								return next();
							} else {
								Playlist.findOne({
									_id: playlistId
								}).then(function(results) {
									var activeUsers = results.activeUsers;
									io.to(playlistId).emit('leavePlaylist', req.user, activeUsers);
								}).catch(function(err) {
									console.log('dissconnect', err);
									return next();
								});
							}
						});

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
						addedBy: req.user,
						isPlaying: false
					};


					Playlist.findOneAndUpdate({
							_id: playlistId,
							'tracks.id': {
								$ne: newTrackData.id
							}
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
							upsert: false,
							new: true
						},
						function(err, docs) {
							if (err) {
								console.log(err);
							} else if (docs === null) {
								console.log('duplicate');
							} else {
								var databaseTrackData = docs.tracks[docs.tracks.length - 1];
								io.to(playlistId).emit('addTrack', databaseTrackData);

								// Vibrant.from(databaseTrackData.album.images[0].url).getPalette().then(function(palette) {
								// 	console.log(palette);
								// 	if (palette.Vibrant) {
								// 		databaseTrackData.set('primaryColor', palette.Vibrant._rgb[0] + "," + palette.Vibrant._rgb[1] + "," + palette.Vibrant._rgb[2]);
								// 		docs.save();
								// 		// newTrackData.primaryColor = palette.Vibrant._rgb[0] + "," + palette.Vibrant._rgb[1] + "," + palette.Vibrant._rgb[2];
								// 	} else if (palette.DarkMuted) {
								// 		databaseTrackData.set('primaryColor', palette.DarkMuted._rgb[0] + "," + palette.DarkMuted._rgb[1] + "," + palette.DarkMuted._rgb[2]);
								// 		docs.save();
								// 		// newTrackData.primaryColor = palette.DarkMuted._rgb[0] + "," + palette.DarkMuted._rgb[1] + "," + palette.DarkMuted._rgb[2];
								// 	} else {
								// 		databaseTrackData.set('primaryColor', "102, 119, 128)");
								// 			docs.save();
								// 		// newTrackData.primaryColor = "102, 119, 128)";
								// 	}
								//
								// }).then(function() {});
							}

						}).catch(function(err) {
						console.log(err);
					});


				});

				socket.on('likeTrack', function(trackId) {
					Playlist.findOneAndUpdate({
							"_id": playlistId,
							"tracks.id": trackId
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
								Playlist.findOneAndUpdate({
										_id: playlistId
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
										upsert: true,
										new: true
									},
									function(err, docs) {
										if (err) {
											console.log(err);
										} else {
											io.to(playlistId).emit('likeTrack', trackId, docs.tracks[0]);
										}
									});



							}
						});
				});

				socket.on('deleteTrack', function(trackId) {
					console.log(trackId);
					Playlist.findOneAndUpdate({
							_id: playlistId,
							"tracks.id": trackId
						}, {
							$pull: {
								"tracks": {
									"id": trackId
								}
							},

						}, {
							upsert: true,
							new: false
						},
						function(err, docs) {
							if (err) {
								console.log(err);
							} else {


								if (trackId === docs.tracks[0].id && docs.isPlaying === true && docs.tracks.length > 1) {
									playTrack(docs.tracks[1]);
									io.to(playlistId).emit('deleteTrack', trackId, docs.tracks[1]);
								} else if (trackId === docs.tracks[0].id && docs.isPlaying === false) {
									io.to(playlistId).emit('deleteTrack', trackId, docs.tracks[1]);
								} else {
									io.to(playlistId).emit('deleteTrack', trackId);
								}
								//Delete current track and stops player
								if (trackId === docs.tracks[0].id && docs.isPlaying === true && docs.tracks.length === 1) {
									io.to(playlistId).emit('resetPlayer');
									pauseTrack();
								}
								if (trackId === docs.tracks[0].id && docs.isPlaying === false && docs.tracks.length === 1) {
									io.to(playlistId).emit('resetPlayer');
								}


								// console.log(docs.tracks);
							}
						});
				});

				socket.on('playTrack', function() {

					Playlist.findOne({
						_id: playlistId
					}).then(function(results) {
						if (results.tracks.length > 0) {
							//Save currentTrack and set playing to true
							var currentTrack = results.tracks[0];
							currentTrack.set('isPlaying', true);
							//Save to database and play track
							results.save().then(function() {
								//Set accestoken
								spotifyApi.setAccessToken(req.user.accessToken);
								playTrack(currentTrack);
							}).catch(function(err) {
								console.log(err);
								return next();
							});
						}

					}).catch(function(err) {
						console.log(err);
					});

				});

				function playTrack(currentTrack) {
					spotifyApi.play({
							"uris": [currentTrack.uri]
						})
						.then(function() {

							console.log('started playing in', playlistId);
							console.log('currentrack-name:', currentTrack.name);
							console.log('currentrack-length:', currentTrack.duration_ms);

							io.to(playlistId).emit('playingTrack', currentTrack);

							//Progress bar
							var width = 0;
							var tracklengthSec = Math.floor(currentTrack.duration_ms / 1000);

							intervals[playlistId] = setInterval(function(){
								width += 0.5;
								var percent = (width / tracklengthSec) * 100;
										io.to(playlistId).emit('progressBar', percent);
							},500);

							//Set timeout
							timeouts[playlistId] = setTimeout(function(){
								nextTrack();

							}, currentTrack.duration_ms);
							console.log('play', timeouts);

							Playlist.findOne({
								_id: playlistId
							}).then(function(results) {
								results.set('isPlaying', true).save();
							}).catch(function(err) {
								console.log(err);
							});
						}).catch(function(err) {
							console.log('play function', err);
							checkAccesToken(req, res, next, err, playTrack, currentTrack);
						});
				}

				socket.on('pauseTrack', function() {
					//Set accestoken
					spotifyApi.setAccessToken(req.user.accessToken);
					pauseTrack();
				});

				function pauseTrack() {
					Playlist.findOne({
						_id: playlistId
					}).then(function(results) {
						results.set('isPlaying', false).save();

						clearInterval(intervals[playlistId]);
						delete intervals[playlistId];

						clearTimeout(timeouts[playlistId]);
						delete timeouts[playlistId];
						console.log('pause', timeouts);
						io.to(playlistId).emit('pauseTrack');

						spotifyApi.pause()
							.then(function() {
								console.log('pause track');
								//Save state to database
								Playlist.findOne({
									_id: playlistId
								}).then(function(results) {
									//Stop timer
									// req.timer.stop();
								}).catch(function(err) {
									console.log(err);
								});

							}).catch(function(err) {
								// stoptimer();
								console.log('play function', err);
								checkAccesToken(req, res, next, err, pauseTrack);
							});
					}).catch(function(err) {
						console.log(err);
						next();
					});
				}

				socket.on('nextTrack', function() {
					nextTrack();
				});

				socket.on('prevTrack', function(value) {
					prevTrack();
				});
				// console.log('before', timer);

				function timeout(tracklength) {
					//Update player in database
					Playlist.findOne({
						_id: playlistId
					}).then(function(results) {
						results.set('isPlaying', true).save();
					}).catch(function(err) {
						console.log(err);
					});

				}

				function stoptimer() {
					// clearTimeout(timer);

					Playlist.findOne({
						_id: playlistId
					}).then(function(results) {
						results.set('isPlaying', false).save();
					}).catch(function(err) {
						console.log(err);
					});
					console.log('stopped');
				}

				function nextTrack() {
					Playlist.findOne({
							_id: playlistId,
						},
						function(err, docs) {
							if (err) {
								console.log(err);
							} else {
								if (docs.tracks.length > 1) {
									//Save first track
									var oldCurrentTrack = docs.tracks[0];
									//Remove from array
									oldCurrentTrack.remove();

									oldCurrentTrack.set('isPlaying', false);
									oldCurrentTrack.set('likes', 0);
									oldCurrentTrack.set('createdAt', Date.now());
									//Push old current track to bottom of array with reset values
									docs.tracks.push(oldCurrentTrack);

									docs.save().then(function(newDocs) {
										var newCurrentTrack = newDocs.tracks[0];
										newCurrentTrack.set('isPlaying', true);

										//Save new currentTrack to database and play track
										newDocs.save().then(function(newDocs) {
											//Set accestoken
											spotifyApi.setAccessToken(req.user.accessToken);
											playTrack(newCurrentTrack);

											function playTrack(newCurrentTrack) {
												spotifyApi.play({
														uris: [newCurrentTrack.uri]
													})
													.then(function() {
														console.log('next track in', playlistId);
														console.log('currentrack-name:', newCurrentTrack.name);
														console.log('currentrack-length:', newCurrentTrack.duration_ms);
														// cleartimer();
														// timeout(newCurrentTrack.duration_ms);
														Playlist.findOne({
															_id: playlistId
														}).then(function(results) {
															results.set('isPlaying', true).save();
														}).catch(function(err) {
															console.log(err);
														});
														clearTimeout(timeouts[playlistId]);
														clearInterval(intervals[playlistId]);

														//Progress bar
														var width = 0;
														var tracklengthSec = Math.floor(newCurrentTrack.duration_ms / 1000);

														intervals[playlistId] = setInterval(function(){
															width += 0.5;
															var percent = (width / tracklengthSec) * 100;
																	io.to(playlistId).emit('progressBar', percent);
														},500);

														timeouts[playlistId] = setTimeout(nextTrack, newCurrentTrack.duration_ms);
														console.log('next track', timeouts);

														io.to(playlistId).emit('nextTrack', oldCurrentTrack);
														io.to(playlistId).emit('playingTrack', newCurrentTrack, oldCurrentTrack);
													}).catch(function(err) {
														console.log('play function', err);
														checkAccesToken(req, res, next, err, playTrack, newCurrentTrack);
													});
											}
										}).catch(function(err) {
											console.log(err);
										});

									}).catch(function(err) {
										console.log(err);
									});
								}
							}
						});

				}

				function prevTrack() {
					console.log('prev');
					Playlist.findOne({
							_id: playlistId,
						},
						function(err, docs) {
							if (err) {
								console.log(err);
							} else {
								if (docs.tracks.length > 1) {
									var oldCurrentTrack = docs.tracks[0];

									oldCurrentTrack.set('isPlaying', false);


									docs.save().then(function(newDocs) {
										var newCurrentTrack = newDocs.tracks[newDocs.tracks.length - 1];
										newCurrentTrack.remove();
										newCurrentTrack.set('isPlaying', true);
										newCurrentTrack.set('likes', 0);
										newCurrentTrack.set('createdAt', Date.now());
										newDocs.tracks.unshift(newCurrentTrack);

										// var newCurrentTrack = newDocs.tracks[0];
										// newCurrentTrack.set('isPlaying', true);

										//Save new currentTrack to database and play track
										newDocs.save().then(function(newDocs) {
											//Set accestoken
											spotifyApi.setAccessToken(req.user.accessToken);
											playTrack();

											function playTrack() {
												spotifyApi.play({
														uris: [newCurrentTrack.uri]
													})
													.then(function(data) {
														// cleartimer();
														// timeout(newCurrentTrack.duration_ms);
														io.to(playlistId).emit('playingTrack', newCurrentTrack, oldCurrentTrack);
													}).catch(function(err) {
														console.log('play function', err);
														checkAccesToken(req, res, next, err, playTrack);
													});
											}
										}).catch(function(err) {
											console.log(err);
										});

									}).catch(function(err) {
										console.log(err);
									});
								}
							}
						});
				}

				socket.on('searchTrack', function(value) {
					spotifyApi.setAccessToken(req.user.accessToken);

					Playlist.findOne({
							_id: playlistId,
						},
						function(err, docs) {
							if (err) {
								console.log(err);
							} else {
								console.log(docs);
								searchTrack(value, docs);
							}
						});

					function searchTrack(value, playlistData) {
						spotifyApi.searchTracks(value)
							.then(function(data) {
								socket.emit('searchTrack', data.body.tracks.items, playlistData.tracks);
							}, function(err) {
								console.error(err);
								searchTrack(req, res, next, err, searchTrack, value);
							});
					}

				});

				socket.on('showPlaylist', function(userId, userPlaylistId) {
					spotifyApi.setAccessToken(req.user.accessToken);

					Playlist.findOne({
							_id: playlistId,
						},
						function(err, docs) {
							if (err) {
								console.log(err);
							} else {
								getPlaylist(docs);
							}
						});


					function getPlaylist(docs) {
						spotifyApi.getPlaylist(userId, userPlaylistId)
							.then(function(data) {
								var userPlaylistData = data.body;

								socket.emit('showPlaylist', userPlaylistData, docs.tracks);
							}).catch(function(err) {
								console.log(err);
								checkAccesToken(req, res, next, err, getPlaylist, docs);
							});
					}

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
								deviceIds: [device.id]
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

				socket.on('error', function(err) {
					if (err === 'handshake error') {
						console.log('handshake error', err);
					} else {
						console.log('io error', err);
					}
				});
			});

			//Get playlist from database
			Playlist.findOne({
				_id: playlistId
			}).then(function(results) {
				console.log(results);
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
							res.render('playlist', {
								playlistData: results,
								user: req.user,
								topTracks: topTracks,
								userPlaylists: userPlaylists,
							});

						}).catch(function(err) {
							console.log(err);
							checkAccesToken(req, res, next, err, getUserPlaylist);
						});
				}

				getUserTopTracks();

			}).catch(function(err) {
				console.log('database',err);
				res.redirect('/playlists');
			});
		}
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
			users: req.user,
			admins: req.user.spotifyId,
			createdBy: req.user,
			qrCodeId: id,
			isPlaying: false
		}).save().then(function() {
			res.redirect('playlists');
		}).catch(function(err) {
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
			res.redirect('/login');
		}
	}

	function checkAccesToken(req, res, next, error, callback, data) {
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
						// console.log('raw', raw);
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
					callback(data);
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

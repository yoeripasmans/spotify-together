var express = require('express');
var router = express.Router();
var passport = require('passport');
var refresh = require('passport-oauth2-refresh');
var SpotifyStrategy = require('passport-spotify').Strategy;
var User = require('./models/user');

var client_id = process.env.CLIENT_ID; // Client ID
var client_secret = process.env.CLIENT_SECRET; //Client secret
var redirect_uri = process.env.REDIRECT_URI; // Redirect URI

function auth() {
	//Serialize users into and deserialize users out of the session.  By storing the user when serializing, and finding the user when deserializing.
	passport.serializeUser(function(user, done) {
		done(null, user._id);
	});

	passport.deserializeUser(function(id, done) {
		User.findById(id, function(err, user) {
			done(err, user);
		});
	});
	// Use the SpotifyStrategy within Passport.
	var strategy = new SpotifyStrategy({
			clientID: client_id,
			clientSecret: client_secret,
			callbackURL: redirect_uri
		},
		function(accessToken, refreshToken, expires_in, profile, done) {
			console.log(profile);
			//Search for user in database
			User.findOne({
				spotifyId: profile.id
			}, function(err, user) {
				if (err) {
					return done(err);
				}
				//If no user is found create one and save it in the database
				if (!user) {
					user = new User({
						spotifyId: profile.id,
						product: profile.product,
						displayName: profile.displayName,
						birthdate: profile.birthdate,
						country: profile.country,
						username: profile.username,
						email: profile.emails[0].value,
						profilePic: profile.photos[0],
						accessToken: accessToken,
						refreshToken: refreshToken,
					});
					user.save(function(err) {
						if (err) console.log(err);
						return done(err, user);
					});
				} else {
					//If user found return user
					return done(err, user);
				}
			});
		});

	passport.use(strategy);
	refresh.use(strategy);

}

module.exports.auth = auth;

//Auth based on this example https://github.com/JMPerez/passport-spotify/blob/master/examples/login/app.js

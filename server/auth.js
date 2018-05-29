var passport = require('passport');
var SpotifyStrategy = require('passport-spotify').Strategy;
var User = require('./models/user');

var client_id = process.env.CLIENT_ID; // Client ID
var client_secret = process.env.CLIENT_SECRET; //Client secret
var redirect_uri = process.env.REDIRECT_URI; // Redirect URI

function auth() {
	console.log(client_id);
	//Serialize users into and deserialize users out of the session.  By storing the user when serializing, and finding the user when deserializing.
	passport.serializeUser(function(user, done) {
		done(null, user);
	});

	passport.deserializeUser(function(obj, done) {
		done(null, obj);
	});
	// Use the SpotifyStrategy within Passport.
	passport.use(new SpotifyStrategy({
			clientID: client_id,
			clientSecret: client_secret,
			callbackURL: redirect_uri
		},
		function(accessToken, refreshToken, expires_in, profile, done) {
			// Asynchronous verification
			process.nextTick(function() {
				//If user exist in database associate the spotify account with a user record in the database and return that user.
				User.findOne({
					spotifyId: profile.id
				}).then(function(currentUser) {
					if (currentUser) {
						currentUser.accessToken = accessToken;
						currentUser.save().then(function(currentUser) {
							return done(null, currentUser);
						}).catch(function(err) {
							console.log(err);
						});
					//If user doesn't exist in database create a new user record with the spotify account details.
					} else {
						new User({
							spotifyId: profile.id,
							username: profile.username,
							displayName: profile.displayName,
							email: profile.emails[0].value,
							profilePic: profile.photos[0],
							accessToken: accessToken,
							refreshToken: refreshToken,
						}).save().then(function(newUser) {
							return done(null, newUser);
						}).catch(function(err) {
							console.log(err);
						});
					}
				});

				// User.findOrCreate({
				// 	spotifyId: profile.id,
				// 	username: profile.username,
				// 	displayName: profile.displayName,
				// 	email: profile.emails[0].value,
				// 	profilePic: profile.photos[0],
				// 	accessToken: accessToken,
				// 	refreshToken: refreshToken,
				// }, function(err, user) {
				// 	console.log('A new uxer from "%s" was inserted', user.spotifyId);
				// 	return done(null, user);
				// });


				// profile.accessToken = accessToken;
				// return done(null, profile);
			});
		}));

}

module.exports.auth = auth;

//Auth based on this example https://github.com/JMPerez/passport-spotify/blob/master/examples/login/app.js

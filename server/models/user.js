var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var Schema = mongoose.Schema;

// create a schema
var userSchema = new Schema({
   spotifyId: String,
   displayName: String,
   username: String,
   email: String,
   images: Object,
   accessToken: String,
   profilePic: String,
   refreshToken: String,
   birthdate: Date,
   country: String,

});
userSchema.plugin(findOrCreate);

// Set to user model
var User = mongoose.model('User', userSchema);

module.exports = User;

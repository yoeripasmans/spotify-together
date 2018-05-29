// grab the things we need
var mongoose = require('mongoose');
var findOrCreate = require('mongoose-findorcreate');
var Schema = mongoose.Schema;

// create a schema
var userSchema = new Schema({
   spotifyId: String,
   username: String,
   email: String,
   accessToken: String,
   profilePic: String,
   refreshToken: String

});
userSchema.plugin(findOrCreate);
// the schema is useless so far
// we need to create a model using it
var User = mongoose.model('User', userSchema);

// make this available to our users in our Node applications
module.exports = User;

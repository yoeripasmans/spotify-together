var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var playlistSchema = new Schema({
   name: String,
   description: String,
   image: String,
   tracks: Array,
   restrictions: Boolean,
   private: Boolean,
   password: String,
   users: Array,
   activeUsers: Array,
   admins: Array,
   rules: Object,

}, {timestamps: true});

// Set to user model
var Playlists = mongoose.model('Playlists', playlistSchema);

module.exports = Playlists;

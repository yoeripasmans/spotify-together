var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create a schema
var playlistSchema = new Schema({
   id: Number,
   name: String,
   description: String,
   image: String,
   songs: Array,
   restrictions: Boolean,
   private: Boolean,
   password: Boolean,
   users: Array,
   rules: Object
});

// Set to user model
var Playlists = mongoose.model('Playlists', playlistSchema);

module.exports = Playlists;

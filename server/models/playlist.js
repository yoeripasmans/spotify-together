var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var trackSchema = new Schema({
	name: String,
	id: String,
	uri: String,
	artists: Array,
	album: Object,
	duration_ms: Number,
	likes: Number,
	addedBy: Object,
},{
	timestamps: true
});
// create a schema
var playlistSchema = new Schema(
{
	name: String,
	description: String,
	image: String,
	tracks: [trackSchema],
	restrictions: Boolean,
	private: Boolean,
	password: String,
	users: Array,
	activeUsers: Array,
	admins: Array,
	createdBy: Object,
	rules: Object,

}, {
	timestamps: true
});

// Set to user model
var Playlists = mongoose.model('Playlists', playlistSchema);

module.exports = Playlists;

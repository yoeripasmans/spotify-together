var mongoose = require('mongoose');
var arrayUniquePlugin = require('mongoose-unique-array');
var Schema = mongoose.Schema;

var trackSchema = new Schema({
	name: String,
	id: String,
	uri: String,
	artists: Array,
	album: Object,
	duration_ms: Number,
	likes: Number,
	userLiked: Array,
	addedBy: Object,
	isPlaying: Boolean
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
	restricted: Boolean,
	private: Boolean,
	password: String,
	users: Array,
	activeUsers: Array,
	admins: Array,
	createdBy: Object,
	rules: Object,
	qrCodeId: String,
	isPlaying: Boolean

}, {
	timestamps: true
});

// Attach the plugin to the schema
 // trackSchema.plugin(arrayUniquePlugin);

// Set to user model
var Playlists = mongoose.model('Playlists', playlistSchema);

module.exports = Playlists;

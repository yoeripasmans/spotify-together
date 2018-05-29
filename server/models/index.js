var mongoose = require('mongoose');
//Set up default mongoose connection
var mongoDB = process.env.dbURI;
mongoose.connect(mongoDB);
// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;
//Get the default connection
var db = mongoose.connection;

// CONNECTION EVENTS
// When successfully connected
db.on('connected', function () {
  console.log('Mongoose default connection open to ' + mongoDB);
});

// If the connection throws an error
db.on('error',function (err) {
  console.log('Mongoose default connection error: ' + err);
});

// When the connection is disconnected
db.on('disconnected', function () {
  console.log('Mongoose default connection disconnected');
});

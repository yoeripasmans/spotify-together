exports = module.exports = function(io){
  io.sockets.on('connection', function (socket) {
    console.log('a user connected');
  });
};

var socket = io('/');

socket.on('joinroom', function(room){
    console.log(room);
});

socket.on('leaveroom', function(room){
    console.log('leave room');
});

socket.on('showsocket', function(socket){
    console.log(socket);
});

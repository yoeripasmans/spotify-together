var socket = io('/');

var showAddTracksButton = document.querySelector('.show-add-tracks');

showAddTracksButton.addEventListener('click', function(){
	console.log('add');
	socket.emit('ShowAddTracks');
});

socket.on('ShowAddTracks', function(data){
    console.log(data);
	var addTrackOverlay = document.createElement('ul');
	var main = document.querySelector('main');
	main.appendChild(addTrackOverlay);

	for (let i = 0; i < data.length; i++) {
		var trackWrapper = document.createElement('li');
		addTrackOverlay.appendChild(trackWrapper);

		var trackName = document.createElement('p');
		trackWrapper.appendChild(trackName);
		trackName.textContent = data[i].name;

		var addTrackButton = document.createElement('button');
		trackWrapper.appendChild(addTrackButton);
		addTrackButton.textContent = "Add";
		addTrackButton.addEventListener('click', function(){
			addTrack(i);
		});
	}

	function addTrack(i){
		console.log(i);
		socket.emit('addTrack', data[i]);
	}
});

socket.on('addTrack', function(trackData){
	var playlist = document.querySelector('.playlist');
	var li = document.createElement('li');
	playlist.appendChild(li);
	var trackName = document.createElement('p');
	li.appendChild(trackName);
	trackName.textContent = trackData.name;
    console.log('addTrack', trackData);
});

socket.on('joinroom', function(room){
    console.log(room);
});

socket.on('leaveroom', function(room){
    console.log('leave room');
});

socket.on('showsocket', function(socket){
    console.log(socket);
});

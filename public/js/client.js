var socket = io('/');

socket.on('connected', function() {
	var showAddTracksButton = document.querySelector('.show-add-tracks');

	showAddTracksButton.addEventListener('click', function() {
		console.log('add');
		socket.emit('ShowAddTracks');
	});
});

socket.on('ShowAddTracks', function(data) {
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
		addTrackButton.addEventListener('click', function() {
			addTrack(i);
		});
	}

	function addTrack(i) {
		console.log(i);
		socket.emit('addTrack', data[i]);
	}
});

socket.on('addTrack', function(trackData) {
	var queue = document.querySelector('.queue');
	var li = document.createElement('li');
	queue.appendChild(li);
	var trackName = document.createElement('p');
	li.appendChild(trackName);
	trackName.textContent = trackData.name;
	console.log('addTrack', trackData);
});


socket.on('joinPlaylist', function(currentUser, activeUsers) {
	var currentusers = document.querySelector('.playlist-currentusers');
	var currentusersAmount = document.querySelector('.playlist-currentusers-amount');
	currentusersAmount.textContent = activeUsers.length + " Users";

	var li = document.createElement('li');
	li.classList.add('current-user');
	li.setAttribute("data-id", currentUser.id);
	currentusers.appendChild(li);

	var profilePic = document.createElement('img');
	li.appendChild(profilePic);
	profilePic.src = currentUser.profilePic;

	var userName = document.createElement('p');
	li.appendChild(userName);
	userName.textContent = currentUser.name;
	console.log(currentUser.name, 'joined');
});

socket.on('showActiveUsers', function(activeUsers) {
	var currentusers = document.querySelector('.playlist-currentusers');
	var currentusersAmount = document.querySelector('.playlist-currentusers-amount');
	currentusersAmount.textContent = activeUsers.length + " Users";

	for (var i = 0; i < activeUsers.length; i++) {
		var li = document.createElement('li');
		li.classList.add('current-user');
		li.setAttribute('data-id', activeUsers[i].id);
		currentusers.appendChild(li);

		var profilePic = document.createElement('img');
		li.appendChild(profilePic);
		profilePic.src = activeUsers[i].profilePic;

		var userName = document.createElement('p');
		li.appendChild(userName);
		userName.textContent = activeUsers[i].name;
		console.log(activeUsers[i].name, 'joined');
	}
	console.log('activeUsers', activeUsers);
});

socket.on('leavePlaylist', function(currentUser, activeUsers) {
		console.log(currentUser.name, 'leaves');
	var currentusers = document.querySelectorAll('.current-user');
	var currentusersAmount = document.querySelector('.playlist-currentusers-amount');
	currentusersAmount.textContent = activeUsers.length + " Users";

	for (var i = 0; i < currentusers.length; i++) {
		if (currentusers[i].getAttribute('data-id') === currentUser.id) {
			currentusers[i].parentNode.removeChild(currentusers[i]);
		}
	}
});

function leavePlaylist(){

}

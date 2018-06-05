var socket = io('/');

socket.on('connected', function() {
	var showAddTracksButton = document.querySelector('.show-add-tracks');
	var closeAddTracksButton = document.querySelector('.close-add-tracks');
	var addTrackOverlay = document.querySelector('#add-track');
	var fetchDevicesButton = document.querySelector('.fetch-devices-button');
	var playButton = document.querySelector('.play-button');

	showAddTracksButton.addEventListener('click', function() {
		socket.emit('showAddTracks');
	});
	fetchDevicesButton.addEventListener('click', function() {
		socket.emit('fetchDevices');
	});
	playButton.addEventListener('click', function() {
		socket.emit('requestPlayTrack');
	});

});
socket.on('requestPlayTrack', function(firstTrack, user) {
	console.log(user.accessToken);
	socket.emit('playTrack');
});

socket.on('showDevices', function(devices) {
	var fetchDevicesWrapper = document.querySelector('.fetch-devices-wrapper');

	for (let i = 0; i < devices.length; i++) {
		var li = document.createElement('li');
		fetchDevicesWrapper.appendChild(li);

		var deviceName = document.createElement('span');
		li.appendChild(deviceName);
		deviceName.textContent = devices[i].name;

		var transferButton = document.createElement('button');
		li.appendChild(transferButton);
		transferButton.textContent = 'Transfer playback';
		transferButton.addEventListener('click', function() {
			socket.emit('transferDevicePlayback', devices[i]);
		});
	}
});

socket.on('showAddTracks', function(data) {
	var trackOverlay = document.querySelector('#add-track');


	var addTrackList = document.createElement('ul');
	trackOverlay.appendChild(addTrackList);

	for (let i = 0; i < data.length; i++) {
		var trackWrapper = document.createElement('li');
		addTrackList.appendChild(trackWrapper);

		var trackName = document.createElement('span');
		trackWrapper.appendChild(trackName);
		trackName.textContent = data[i].name;

		var addTrackButton = document.createElement('button');
		trackWrapper.appendChild(addTrackButton);
		addTrackButton.textContent = "Add";
		addTrackButton.addEventListener('click', function() {
			socket.emit('addTrack', data[i]);
		});
	}
});

socket.on('addTrack', function(trackData) {
	var queue = document.querySelector('.queue');

	var li = document.createElement('li');
	li.classList.add('queue__track');
	queue.appendChild(li);

	var trackName = document.createElement('span');
	li.appendChild(trackName);
	trackName.textContent = trackData.name;

	var artistName = document.createElement('span');
	li.appendChild(artistName);
	artistName.textContent = trackData.artists.map(a => a.name).join(', ');

	var albumName = document.createElement('span');
	li.appendChild(albumName);
	albumName.textContent = trackData.album.name;

	var addedBy = document.createElement('span');
	li.appendChild(addedBy);
	addedBy.textContent = trackData.addedBy;

	var likes = document.createElement('span');
	li.appendChild(likes);

	var likesAmount = document.createElement('span');
	likes.appendChild(likesAmount);
	likesAmount.textContent = trackData.likes;

	var likeButton = document.createElement('button');
	likes.appendChild(likeButton);
	likeButton.textContent = 'Like';

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

var checkboxes = document.querySelectorAll('input[type=checkbox]');

for (var i = 0; i < checkboxes.length; i++) {
	checkboxes[i].addEventListener('change', toggleCheckboxState);
}

window.addEventListener('load', function() {
	for (var i = 0; i < checkboxes.length; i++) {
		if (checkboxes[i].checked === true) {
			checkboxes[i].value = true;
		} else {
			checkboxes[i].value = false;
		}
	}
});

function toggleCheckboxState() {
	if (this.checked === true) {
		this.value = true;
	} else {
		this.value = false;
	}
}

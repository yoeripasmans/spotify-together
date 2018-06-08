var socket = io('/');
var iso;
var queue;

socket.on('connected', function() {
	var showAddTracksButton = document.querySelector('.show-add-tracks');
	var closeAddTracksButton = document.querySelector('.close-add-tracks');
	var addTrackOverlay = document.querySelector('#add-track');
	var fetchDevicesButton = document.querySelector('.fetch-devices-button');
	var playButton = document.querySelector('.play-button');
	var likeButtons = document.querySelectorAll('.track-like-button');
	var deleteButtons = document.querySelectorAll('.track-delete-button');
	var addTrackButton = document.querySelectorAll('.track-add-button');

	for (let i = 0; i < addTrackButton.length; i++) {
		addTrackButton[i].addEventListener('click', function() {
			socket.emit('addTrack', topTracks[i]);
		});
	}


	// showAddTracksButton.addEventListener('click', function(e) {
	// 	// e.preventDefault();
	// 	// addTrackOverlay.classList.add('active');
	// 	socket.emit('showAddTracks');
	// });

	closeAddTracksButton.addEventListener('click', function(e) {
		// e.preventDefault();
		// addTrackOverlay.classList.remove('active');
		// socket.emit('showAddTracks');
	});

	fetchDevicesButton.addEventListener('click', function() {

		socket.emit('fetchDevices');
	});
	playButton.addEventListener('click', function() {
		socket.emit('playTrack');
	});


	for (var i = 0; i < likeButtons.length; i++) {
		likeButtons[i].setAttribute('liked', 'false');
		likeButtons[i].addEventListener('click', likeTrack);
	}
	for (i = 0; i < deleteButtons.length; i++) {
		deleteButtons[i].addEventListener('click', deleteTrack);
	}

	queue = document.querySelector('.queue');

	iso = new Isotope(queue, {
		// options
		itemSelector: '.queue__track',
		layoutMode: 'vertical',
		getSortData: {
			likes: '.like-amount parseInt',
			date: function (el) {
				console.log("name ",el.getAttribute('data-name'), "date ",el.getAttribute('data-created'));
				return Date.parse(el.getAttribute('data-created'));
		  },

	  },

	});

});

function deleteTrack() {
	var trackId = this.parentElement.getAttribute('data-id');
	socket.emit('deleteTrack', trackId);
}

socket.on('deleteTrack', function(trackId) {
	var element = document.querySelector('[data-id="' + trackId + '"]');
	iso.remove(element);
	iso.layout();
});

function likeTrack() {
	if (this.getAttribute('liked') === 'false') {
		// var likeAmount = Number(this.previousElementSibling.textContent) + 1;
		var trackId = this.parentElement.parentElement.getAttribute('data-id');
		// this.previousElementSibling.textContent = likeAmount;
		this.setAttribute('liked', 'true');
		this.disabled = true;
		socket.emit('likeTrack', trackId);
	}
}

socket.on('likeTrack', function(trackId, docs) {
	var likeButton = document.querySelector('[data-id="' + trackId + '"]').children[4].children[1];
	// console.log(likeButton.children[4].children[1]);
	var likeAmount = Number(likeButton.previousElementSibling.textContent) + 1;
	likeButton.previousElementSibling.textContent = likeAmount;

	iso.updateSortData(queue);
	iso.reloadItems();
  	iso.arrange({ sortBy:  [ 'likes', 'date' ], sortAscending: {likes:false, date:true} });

});


socket.on('requestPlayTrack', function(firstTrack, user) {
	console.log(user);
	socket.emit('playTrack');
});

socket.on('showDevices', function(devices) {
	var fetchDevicesWrapper = document.querySelector('.fetch-devices-wrapper');
	fetchDevicesWrapper.classList.add('active');

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
	var trackOverlay = document.querySelector('.add-track-wrapper');

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
	console.log(trackData);
	var queue = document.querySelector('.queue');

	var li = document.createElement('li');
	li.setAttribute('data-id', trackData._id);
	li.setAttribute('data-name', trackData.name);
	li.setAttribute('data-created', trackData.createdAt);
	li.classList.add('queue__track');
	queue.appendChild(li);

	var albumCover = document.createElement('img');
	li.appendChild(albumCover);
	albumCover.src = trackData.album.images[0].url;

	var trackName = document.createElement('span');
	li.appendChild(trackName);
	trackName.textContent = trackData.name;

	var artistName = document.createElement('span');
	li.appendChild(artistName);
	artistName.textContent = trackData.artists.map(a => a.name).join(', ');

	// var albumName = document.createElement('span');
	// li.appendChild(albumName);
	// albumName.textContent = trackData.album.name;

	var addedBy = document.createElement('span');
	li.appendChild(addedBy);
	addedBy.textContent = trackData.addedBy;

	var likes = document.createElement('span');
	likes.classList.add('queue__track-likes');
	li.appendChild(likes);

	var likesAmount = document.createElement('span');
	likes.appendChild(likesAmount);
	likesAmount.classList.add('like-amount');
	likesAmount.textContent = trackData.likes;

	var likeButton = document.createElement('button');
	likes.appendChild(likeButton);
	likeButton.textContent = 'Like';
	likeButton.setAttribute('liked', 'false');
	likeButton.addEventListener('click', likeTrack);

	var removeButton = document.createElement('button');
	li.appendChild(removeButton);
	removeButton.classList.add('track-delete-button');
	removeButton.textContent = 'Remove';
	removeButton.addEventListener('click', deleteTrack);

	iso.appended(li);
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

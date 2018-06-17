var socket = io('/');
var iso;
var tracklist;
var user;

var playButton = document.querySelector('.play-button');
var pauseButton = document.querySelector('.pause-button');
var nextButton = document.querySelector('.next-button');
var prevButton = document.querySelector('.prev-button');

socket.on('connected', function(userDetails) {
	var showAddTracksButton = document.querySelector('.show-add-tracks');
	var closeAddTracksButton = document.querySelector('.close-add-tracks');
	var addTrackOverlay = document.querySelector('#add-track');
	var fetchDevicesButton = document.querySelector('.fetch-devices-button');
	var likeButtons = document.querySelectorAll('.track-like-button');
	var deleteButtons = document.querySelectorAll('.track-delete-button');
	var addTrackButton = document.querySelectorAll('.track-add-button');
	var searchTrackForm = document.querySelector('.track-search');
	user = userDetails;

	//Eventlistener for adding tracks to the playlist
	for (let i = 0; i < addTrackButton.length; i++) {
		addTrackButton[i].addEventListener('click', function() {
			socket.emit('addTrack', topTracks[i]);
		});
	}

	searchTrackForm.addEventListener('keyup', function(e) {
		var topSongs = document.querySelector('.top-songs');
		var searchResults = document.querySelector('.search-results');

		if (e.keyCode === 13) {
			if (this.value.length > 0) {
				searchResults.classList.add('active');
				topSongs.classList.add('hidden');
			} else {
				searchResults.classList.remove('active');
				topSongs.classList.remove('hidden');
			}

			socket.emit('searchTrack', this.value);
		}

		if (this.value.length === 0) {
			searchResults.classList.remove('active');
			topSongs.classList.remove('hidden');
		}

		return false;

	});

	fetchDevicesButton.addEventListener('click', function() {
		socket.emit('fetchDevices');
	});

	if (playButton) {
		//Player event listeners
		playButton.addEventListener('click', function() {
			socket.emit('playTrack');
		});

		pauseButton.addEventListener('click', function() {
			socket.emit('pauseTrack');
		});

		nextButton.addEventListener('click', function() {
			socket.emit('nextTrack');
		});

		prevButton.addEventListener('click', function() {
			socket.emit('prevTrack');
		});
	}

	for (var i = 0; i < likeButtons.length; i++) {
		likeButtons[i].setAttribute('liked', 'false');
		likeButtons[i].addEventListener('click', likeTrack);
	}
	for (i = 0; i < deleteButtons.length; i++) {
		deleteButtons[i].addEventListener('click', deleteTrack);
	}

	tracklist = document.querySelector('.tracklist');
	//Isotope setup
	iso = new Isotope(tracklist, {
		// options
		itemSelector: '.tracklist__track',
		layoutMode: 'vertical',
		getSortData: {
			likes: '.like-amount parseInt',
			date: function(el) {
				// console.log("name ", el.getAttribute('data-name'), "date ", el.getAttribute('data-created'));
				return Date.parse(el.getAttribute('data-created'));
			},
			isPlaying: function(el) {
				return el.getAttribute('data-isplaying');
			}

		},

	});

});

function deleteTrack() {
	var trackId = this.parentElement.parentElement.getAttribute('data-id');
	socket.emit('deleteTrack', trackId);
}

socket.on('deleteTrack', function(trackId) {
	var element = document.querySelector('[data-id="' + trackId + '"]');
	iso.remove(element);
	iso.layout();
});

socket.on('playingTrack', function(currentTrack, oldCurrentTrack) {
	var tracklist = document.querySelectorAll('.queue li');
	for (var i = 0; i < tracklist.length; i++) {
		tracklist[i].setAttribute('data-isplaying', "false");
	}
	var newCurrentTrackEl = document.querySelector('[data-id="' + currentTrack._id + '"]');
	newCurrentTrackEl.setAttribute('data-isplaying', currentTrack.isPlaying);

	if (oldCurrentTrack) {
		var oldCurrentTrackEl = document.querySelector('[data-id="' + oldCurrentTrack._id + '"]');
		oldCurrentTrackEl.setAttribute('data-created', oldCurrentTrack.createdAt);
		var likeButton = document.querySelector('[data-id="' + oldCurrentTrack._id + '"]').children[4].children[1];
		likeButton.previousElementSibling.textContent = 0;
	}
	if (playButton) {
		playButton.classList.add('hidden');
		pauseButton.classList.remove('hidden');
	}

	iso.updateSortData(tracklist);
	iso.reloadItems();
	iso.arrange({
		sortBy: ['isPlaying', 'likes', 'date'],
		sortAscending: {
			isPlaying: false,
			likes: false,
			date: true
		}
	});
	updatePlayer(currentTrack);
});

socket.on('pauseTrack', function(results) {
	if (playButton) {
		playButton.classList.remove('hidden');
		pauseButton.classList.add('hidden');
	}
});

function updatePlayer(currentTrack) {

	var img = document.querySelector('.player-details__track-img');
	img.src = currentTrack.album.images[1].url;

	var name = document.querySelector('.player-details__track-name');
	name.textContent = currentTrack.name;

	var artist = document.querySelector('.player-details__artist-name');
	artist.textContent = currentTrack.artists.map(a => a.name).join(', ');

	var addedBy = document.querySelector('.player-details__addedby');
	addedBy.textContent = currentTrack.addedBy.spotifyId;

	console.log(currentTrack);
}

socket.on('searchTrack', function(trackData) {
	var searchResults = document.querySelector('.search-results-list');
	var elements = document.querySelectorAll('.tracklist__track--search');

	//Remove tracks from search data
	for (let i = 0; i < elements.length; i++) {
		searchResults.removeChild(elements[i]);
	}

	//Add tracks from search data
	for (let i = 0; i < trackData.length; i++) {

		var li = document.createElement('li');
		li.setAttribute('data-name', trackData[i].name);
		li.classList.add('tracklist__track', 'tracklist__track--search');
		searchResults.appendChild(li);

		var albumCover = document.createElement('img');
		li.appendChild(albumCover);
		albumCover.src = trackData[i].album.images[1].url;

		var trackName = document.createElement('span');
		li.appendChild(trackName);
		trackName.textContent = trackData[i].name;

		var artistName = document.createElement('span');
		li.appendChild(artistName);
		artistName.textContent = trackData[i].artists.map(a => a.name).join(', ');

		var addTrackButton = document.createElement('button');
		li.appendChild(addTrackButton);
		addTrackButton.textContent = "Add";
		addTrackButton.addEventListener('click', function() {
			socket.emit('addTrack', trackData[i]);
		});


	}
});

function likeTrack() {
	if (this.getAttribute('liked') === 'false') {
		// var likeAmount = Number(this.previousElementSibling.textContent) + 1;
		var trackId = this.parentElement.parentElement.getAttribute('data-id');
		// this.previousElementSibling.textContent = likeAmount;
		this.setAttribute('liked', 'true');
		this.disabled = true;
		this.classList.add('track-like-button--disabled');
		socket.emit('likeTrack', trackId);
	}
}

socket.on('nextTrack', function(oldCurrentTrack) {
	var oldCurrentTrackEl = document.querySelector('[data-id="' + oldCurrentTrack._id + '"]');
	var likeButton = oldCurrentTrackEl.querySelector('.track-like-button');
	if(likeButton){
		likeButton.disabled = false;
		likeButton.setAttribute('liked', 'false');
		likeButton.classList.remove('track-like-button--disabled');
	}
});

socket.on('likeTrack', function(trackId, docs) {
	var likeButton = document.querySelector('[data-id="' + trackId + '"]').children[4].children[1];
	// console.log(likeButton.children[4].children[1]);
	var likeAmount = Number(likeButton.previousElementSibling.textContent) + 1;
	likeButton.previousElementSibling.textContent = likeAmount;

	iso.updateSortData(tracklist);
	iso.reloadItems();
	iso.arrange({
		sortBy: ['isPlaying', 'likes', 'date'],
		sortAscending: {
			isPlaying: false,
			likes: false,
			date: true
		}
	});

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

socket.on('addTrack', function(trackData, spotifyId) {
	console.log(trackData);
	var tracklist = document.querySelector('.tracklist');
	console.log(tracklist.childNodes.length);
	// if (tracklist.childNodes.length <= 1) {
	// 	updatePlayer(trackData);
	// }

	var li = document.createElement('li');
	li.setAttribute('data-id', trackData._id);
	li.setAttribute('data-name', trackData.name);
	li.setAttribute('data-created', trackData.createdAt);
	li.setAttribute('data-isplaying', trackData.isPlaying);
	li.classList.add('tracklist__track');
	tracklist.appendChild(li);

	var albumCover = document.createElement('img');
	li.appendChild(albumCover);
	albumCover.src = trackData.album.images[1].url;

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
	addedBy.textContent = trackData.addedBy.spotifyId;

	var likes = document.createElement('span');
	likes.classList.add('tracklist__track-likes');
	li.appendChild(likes);

	var likesAmount = document.createElement('span');
	likes.appendChild(likesAmount);
	likesAmount.classList.add('like-amount');
	likesAmount.textContent = trackData.likes;

	if (trackData.addedBy.spotifyId === user.spotifyId) {
		var removeButton = document.createElement('button');
		likes.appendChild(removeButton);
		removeButton.classList.add('track-delete-button');
		removeButton.addEventListener('click', deleteTrack);

		var removeButtonSpan = document.createElement('span');
		removeButton.appendChild(removeButtonSpan);
		removeButtonSpan.textContent = 'Remove';

		var removeButtonIcon = document.createElement('img');
		removeButton.appendChild(removeButtonIcon);
		removeButtonIcon.src = '/icons/icon_cross.svg';

	} else {
		var likeButton = document.createElement('button');
		likes.appendChild(likeButton);
		likeButton.setAttribute('liked', 'false');
		likeButton.classList.add('track-like-button');
		likeButton.addEventListener('click', likeTrack);

		var likeButtonSpan = document.createElement('span');
		likeButton.appendChild(likeButtonSpan);
		likeButtonSpan.textContent = 'Like';

		var likeButtonIcon = document.createElement('img');
		likeButton.appendChild(likeButtonIcon);
		likeButtonIcon.src = '/icons/icon_heart.svg';
	}

	iso.appended(li);
});


socket.on('joinPlaylist', function(currentUser, activeUsers) {
	console.log(currentUser);
	var currentusers = document.querySelector('.playlist-currentusers');
	var currentusersAmount = document.querySelector('.playlist-currentusers-amount');
	currentusersAmount.textContent = activeUsers.length + " Users";

	var li = document.createElement('li');
	li.classList.add('current-user');
	li.setAttribute("data-id", currentUser.spotifyId);
	currentusers.appendChild(li);

	var profilePic = document.createElement('img');
	li.appendChild(profilePic);
	profilePic.src = currentUser.profilePic;

	var userName = document.createElement('p');
	li.appendChild(userName);
	userName.textContent = currentUser.spotifyId;
	console.log(currentUser.username, 'joined');
});

socket.on('showActiveUsers', function(activeUsers) {
	var currentusers = document.querySelector('.playlist-currentusers');
	var currentusersAmount = document.querySelector('.playlist-currentusers-amount');
	currentusersAmount.textContent = activeUsers.length + " Users";

	for (var i = 0; i < activeUsers.length; i++) {
		var li = document.createElement('li');
		li.classList.add('current-user');
		li.setAttribute('data-id', activeUsers[i].spotifyId);
		currentusers.appendChild(li);

		var profilePic = document.createElement('img');
		li.appendChild(profilePic);
		profilePic.src = activeUsers[i].profilePic;

		var userName = document.createElement('p');
		li.appendChild(userName);
		userName.textContent = activeUsers[i].spotifyId;
		console.log(activeUsers[i].spotifyId, 'joined');
	}
	console.log('activeUsers', activeUsers);
});

socket.on('leavePlaylist', function(currentUser, activeUsers) {
	console.log(currentUser.spotifyId, 'leaves');
	var currentusers = document.querySelectorAll('.current-user');
	var currentusersAmount = document.querySelector('.playlist-currentusers-amount');
	currentusersAmount.textContent = activeUsers.length + " Users";

	for (var i = 0; i < currentusers.length; i++) {
		if (currentusers[i].getAttribute('data-id') === currentUser.spotifyId) {
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

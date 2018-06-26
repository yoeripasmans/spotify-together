var socket = io('/');
var iso;
var tracklist;
var user;

var playButton = document.querySelector('.play-button');
var pauseButton = document.querySelector('.pause-button');
var nextButton = document.querySelector('.next-button');
var prevButton = document.querySelector('.prev-button');

socket.emit('connected');

socket.on('connected', function(userDetails) {
	var showAddTracksButton = document.querySelector('.show-add-tracks');
	var closeAddTracksButton = document.querySelector('.close-add-tracks');
	var addTrackOverlay = document.querySelector('#add-track');
	var fetchDevicesButton = document.querySelector('.fetch-devices-button');
	var likeButtons = document.querySelectorAll('.track-like-button');
	var deleteButtons = document.querySelectorAll('.track-delete-button');
	var addTrackButton = document.querySelectorAll('.track-add-button');
	var searchTrackForm = document.querySelector('.track-search');
	var showPlaylistButton = document.querySelectorAll('.show-playlist-button');

	user = userDetails;

	//Eventlistener for adding tracks to the playlist
	for (let i = 0; i < addTrackButton.length; i++) {
		addTrackButton[i].addEventListener('click', function() {
			socket.emit('addTrack', topTracks[i]);
		});
	}

	//Eventlistener for showing personal playlist track in the add section
	for (let i = 0; i < showPlaylistButton.length; i++) {
		showPlaylistButton[i].addEventListener('click', function() {
			console.log(this.parentElement.getAttribute('data-playlistid'));
			socket.emit('showPlaylist', this.parentElement.getAttribute('data-playlistowner'), this.parentElement.getAttribute('data-playlistid'));
		});
	}

	//Search
	var searchIcon = document.querySelector('.track-search-icon');
	var topSongs = document.querySelector('.top-songs');
	var searchResults = document.querySelector('.search-results');
	var userPlaylists = document.querySelector('.user-playlists-overview');

	searchTrackForm.addEventListener('keyup', function(e) {

		if (this.value.length > 0) {
			toggleCloseIcon();
			var _this = this;
			searchIcon.addEventListener('click', function() {
				removeSearch(_this);
			});
		} else {
			toggleSearchIcon();
		}

		if (e.keyCode === 13 && this.value.length > 0) {
			showSearchResults();
			socket.emit('searchTrack', this.value);
		}

		if (this.value.length === 0) {
			hideSearchResults();
		}

		return false;

	});

	function showSearchResults() {
		searchResults.classList.add('active');
		topSongs.classList.add('hidden');
		userPlaylists.classList.add('hidden');
	}

	function hideSearchResults() {
		searchResults.classList.remove('active');
		topSongs.classList.remove('hidden');
		userPlaylists.classList.remove('hidden');
	}

	function removeSearch(_this) {
		_this.value = "";
		toggleSearchIcon();
		hideSearchResults();
	}

	function toggleCloseIcon() {
		searchIcon.src = "/icons/close.svg";
	}

	function toggleSearchIcon() {
		searchIcon.src = "/icons/search.svg";
	}
	//Show user playlist
	var userPlaylistClose = document.querySelector('.close-playlist-button');

	//Close wrapper
	userPlaylistClose.addEventListener('click', function() {
		userPlaylistWrapper.classList.add('hidden');
		var userPlaylistTracklistElements = document.querySelectorAll('.tracklist__track--results');
		removeTrackList(userPlaylistTracklist, userPlaylistTracklistElements);
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

	//Toggle qr code
	var qrOverlay = document.querySelector('.qr-overlay');
	var openQrOverlayButton = document.querySelector('.show-qr-code');
	var closeQrOverlayButton = document.querySelector('.close-qr-overlay-button');

	openQrOverlayButton.addEventListener('click', function() {
		qrOverlay.classList.remove('hidden');
	});
	closeQrOverlayButton.addEventListener('click', function() {
		qrOverlay.classList.add('hidden');
	});

	//Toggle devices
	var fetchDevicesOverlay = document.querySelector('.fetch-devices-overlay');
	var closeFetchOverlayButton = document.querySelector('.close-fetch-overlay-button');

	closeFetchOverlayButton.addEventListener('click', function() {
		fetchDevicesOverlay.classList.add('hidden');
	});

	if (fetchDevicesButton) {
		fetchDevicesButton.addEventListener('click', function(e) {
			fetchDevicesOverlay.classList.remove('hidden');
			socket.emit('fetchDevices');
		});
	}

	//Toggle cast
	var castActiveButton = document.querySelector('.cast-active-button');
	var castInactiveButton = document.querySelector('.cast-inactive-button');

	if (castActiveButton) {
		castActiveButton.addEventListener('click', function() {
			document.body.classList.add('cast');
		});
	}

	if (castInactiveButton) {
		castInactiveButton.addEventListener('click', function() {
			document.body.classList.remove('cast');
		});
	}


	if (closeFetchOverlayButton) {
		closeFetchOverlayButton.addEventListener('click', function() {
			fetchDevicesOverlay.classList.add('hidden');
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

socket.on('deleteTrack', function(trackId, currentTrack) {
	var element = document.querySelector('[data-id="' + trackId + '"]');
	checkmarkToggle(trackId, false);

	if (currentTrack) {
		updatePlayer(currentTrack);
	}

	iso.remove(element);
	iso.layout();
});

socket.on('playingTrack', function(currentTrack, oldCurrentTrack) {
	var tracklist = document.querySelectorAll('.queue li');
	for (var i = 0; i < tracklist.length; i++) {
		tracklist[i].setAttribute('data-isplaying', "false");
	}
	var newCurrentTrackEl = document.querySelector('[data-id="' + currentTrack.id + '"]');
	newCurrentTrackEl.setAttribute('data-isplaying', currentTrack.isPlaying);

	if (oldCurrentTrack) {
		var oldCurrentTrackEl = document.querySelector('[data-id="' + oldCurrentTrack.id + '"]');
		oldCurrentTrackEl.setAttribute('data-created', oldCurrentTrack.createdAt);
		var likeButton = document.querySelector('[data-id="' + oldCurrentTrack.id + '"]').children[4].children[1];
		likeButton.previousElementSibling.textContent = 0;
	}
	if (playButton) {
		playButton.classList.add('hidden');
		pauseButton.classList.remove('hidden');
	}
	var playStatus = document.querySelector('.play-status');
	playStatus.textContent = "Playing";

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
	var progressBar = document.querySelector('.progress-bar');

socket.on('progressBar', function(width) {
	progressBar.style.width = width + "%";
});

socket.on('pauseTrack', function(results) {
	if (playButton) {
		playButton.classList.remove('hidden');
		pauseButton.classList.add('hidden');
	}
	var playStatus = document.querySelector('.play-status');
	playStatus.textContent = "Paused";

	progressBar.style.width = 0;
});

function updatePlayer(currentTrack) {
	var addTrackButton = document.querySelector('.show-add-tracks');

	var playlistheaderImg = document.querySelector('.header-currenttrack-img');
	playlistheaderImg.src = currentTrack.album.images[1].url;

	if (currentTrack.isPlaying === true) {
		var backgroundImage = document.querySelector('.background-image--playlist');
		backgroundImage.style.backgroundImage = "url(" + currentTrack.album.images[0].url + ")";
	}

	var img = document.querySelector('.player-details__track-img');
	img.src = currentTrack.album.images[1].url;

	var name = document.querySelector('.player-details__track-name');
	name.textContent = currentTrack.name;

	var artist = document.querySelector('.player-details__artist-name');
	artist.textContent = currentTrack.artists.map(a => a.name).join(', ');

	var addedBy = document.querySelector('.player-details__addedby');

	// Promise
	Vibrant.from(currentTrack.album.images[0].url).getPalette().then(function(palette) {
		if (palette.Vibrant && palette.LightVibrant) {
			addTrackButton.style.backgroundColor = "rgb(" + palette.Vibrant._rgb[0] + "," + palette.Vibrant._rgb[1] + "," + palette.Vibrant._rgb[2] + ")";
			progressBar.style.backgroundColor = "rgb(" + palette.Vibrant._rgb[0] + "," + palette.Vibrant._rgb[1] + "," + palette.Vibrant._rgb[2] + ")";
		} else {
			addTrackButton.style.backgroundColor = "rgb(102, 119, 128)";
			progressBar.style.backgroundColor = "#fff";
		}

		console.log(palette);
	}).catch(function(err) {
		console.log(err);
	});
	addTrackButton.style.backgroundColor = "rgb(" + currentTrack.primaryColor + ")";


	if (currentTrack.addedBy.displayName) {
		addedBy.textContent = currentTrack.addedBy.displayName.split(" ")[0];
	} else {
		addedBy.textContent = currentTrack.addedBy.username;
	}

	console.log(currentTrack);
}
var userPlaylistWrapper = document.querySelector('.user-playlist');
var userPlaylistTracklist = document.querySelector('.add-playlist-tracks');

socket.on('showPlaylist', function(userPlaylistData, playlistData) {

	var userPlaylistTitle = document.querySelector('.user-playlist-header__title');
	var userPlaylistCover = document.querySelector('.user-playlist-cover');
	var userPlaylistCreatedByText = document.querySelector('.user-playlist-header__user-created span');
	var userPlaylistCreatedByImg = document.querySelector('.user-playlist-header__user-created img');
	var userPlaylistWrapper = document.querySelector('.user-playlist');


	//Open wrapper
	userPlaylistWrapper.classList.remove('hidden');
	userPlaylistTitle.textContent = userPlaylistData.name;
	userPlaylistCover.src = userPlaylistData.images[1].url;
	console.log(userPlaylistData);

	if (userPlaylistData.owner.display_name) {
		userPlaylistCreatedByText.textContent = "Created by: " + userPlaylistData.owner.display_name;
	} else {
		userPlaylistCreatedByText.textContent = "Created by: " + userPlaylistData.owner.id;
	}

	//Save tracks from user playlist into array
	var userPlaylistTracklistData = userPlaylistData.tracks.items.map(value => value.track);
	//Create tracklist
	createTracklist(userPlaylistTracklistData, playlistData, userPlaylistTracklist);
});

socket.on('searchTrack', function(trackData, playlistData) {
	var searchResults = document.querySelector('.search-results-list');
	var elements = document.querySelectorAll('.tracklist__track--results');
	removeTrackList(searchResults, elements);
	createTracklist(trackData, playlistData, searchResults);
});

function removeTrackList(wrapper, elements) {
	console.log('remove');
	//Remove tracks
	for (let i = 0; i < elements.length; i++) {
		wrapper.removeChild(elements[i]);
	}
}

function createTracklist(trackData, playlistData, wrapper) {
	//Add tracks from search data
	for (let i = 0; i < trackData.length; i++) {

		var li = document.createElement('li');
		li.setAttribute('data-name', trackData[i].name);
		li.setAttribute('data-trackid', trackData[i].id);
		li.classList.add('tracklist__track', 'tracklist__track--results');

		if (wrapper) {
			wrapper.appendChild(li);
		}

		var albumCover = document.createElement('img');
		li.appendChild(albumCover);
		albumCover.classList.add('tracklist__track-img');
		albumCover.src = trackData[i].album.images[1].url;

		var trackName = document.createElement('span');
		trackName.classList.add('tracklist__track-name');
		li.appendChild(trackName);
		trackName.textContent = trackData[i].name;

		var artistName = document.createElement('span');
		li.appendChild(artistName);
		artistName.classList.add('artist-name');
		artistName.textContent = trackData[i].artists.map(a => a.name).join(', ');

		var addTrackButton = document.createElement('button');
		li.appendChild(addTrackButton);
		addTrackButton.classList.add('track-add-button');

		var addTrackButtonSpan = document.createElement('span');
		addTrackButtonSpan.textContent = "Add track";
		addTrackButton.appendChild(addTrackButtonSpan);

		var addTrackButtonIcon = document.createElement('img');
		addTrackButtonIcon.classList.add('icon');
		addTrackButton.appendChild(addTrackButtonIcon);

		var liked;

		for (let j = 0; j < playlistData.length; j++) {
			if (trackData[i].id === playlistData[j].id) {
				liked = true;
				break;
			} else {
				liked = false;
			}
		}

		if (liked === true) {
			addTrackButton.disabled = true;
			addTrackButtonIcon.src = "/icons/check.svg";
		} else {
			addTrackButton.disabled = false;
			addTrackButtonIcon.src = "/icons/add.svg";
		}

		addTrackButton.addEventListener('click', function() {
			socket.emit('addTrack', trackData[i]);
		});


	}
}

function likeTrack() {
	if (this.getAttribute('liked') === 'false') {
		// var likeAmount = Number(this.previousElementSibling.textContent) + 1;
		var trackId = this.parentElement.parentElement.getAttribute('data-id');
		// this.previousElementSibling.textContent = likeAmount;
		this.setAttribute('liked', 'true');
		this.childNodes[1].src = "/icons/heart-filled.svg";
		this.disabled = true;
		this.classList.add('track-like-button--disabled');
		socket.emit('likeTrack', trackId);
	}
}

socket.on('nextTrack', function(oldCurrentTrack) {
	var oldCurrentTrackEl = document.querySelector('[data-id="' + oldCurrentTrack.id + '"]');
	var likeButton = oldCurrentTrackEl.querySelector('.track-like-button');
	if (likeButton) {
		likeButton.disabled = false;
		likeButton.setAttribute('liked', 'false');
		likeButton.classList.remove('track-like-button--disabled');
		likeButton.childNodes[1].src = "/icons/heart.svg";
	}
	progressBar.style.width = 0;
});

socket.on('likeTrack', function(trackId, currentTrack) {
	var likeButton = document.querySelector('[data-id="' + trackId + '"]').children[4].children[1];
	// console.log(likeButton.children[4].children[1]);
	var likeAmount = Number(likeButton.previousElementSibling.textContent) + 1;
	likeButton.previousElementSibling.textContent = likeAmount;

	updatePlayer(currentTrack);

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

socket.on('resetPlayer', function() {
	console.log('clear');
	var playlistheaderImg = document.querySelector('.header-currenttrack-img');
	playlistheaderImg.src = "//:0";

	var backgroundImage = document.querySelector('.background-image--playlist');
	backgroundImage.style.backgroundImage = "";

	var img = document.querySelector('.player-details__track-img');
	img.src = "//:0";

	var name = document.querySelector('.player-details__track-name');
	name.textContent = "";

	var artist = document.querySelector('.player-details__artist-name');
	artist.textContent = "";

	var addedBy = document.querySelector('.player-details__addedby');
	addedBy.textContent = "";

});

socket.on('showDevices', function(devices) {
	console.log('show device');
	var fetchDevicesWrapper = document.querySelector('.fetch-devices-wrapper');

	var deviceElements = document.querySelectorAll('.device-element');
	for (var i = 0; i < deviceElements.length; i++) {
			fetchDevicesWrapper.removeChild(deviceElements[i]);
	}

	for (let i = 0; i < devices.length; i++) {
		var li = document.createElement('li');
		li.classList.add('device-element');
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
	var tracklist = document.querySelector('.tracklist');
	if (tracklist.childNodes.length <= 1) {
		updatePlayer(trackData);
	}
	//Create new element
	var li = document.createElement('li');
	li.setAttribute('data-id', trackData.id);
	li.setAttribute('data-name', trackData.name);
	li.setAttribute('data-created', trackData.createdAt);
	li.setAttribute('data-isplaying', trackData.isPlaying);
	li.classList.add('tracklist__track');
	tracklist.appendChild(li);

	var albumCover = document.createElement('img');
	albumCover.classList.add('tracklist__track-img');
	li.appendChild(albumCover);
	albumCover.src = trackData.album.images[1].url;

	var trackName = document.createElement('span');
	trackName.classList.add('tracklist__track-name');
	li.appendChild(trackName);
	trackName.textContent = trackData.name;

	var artistName = document.createElement('span');
	artistName.classList.add('tracklist__track-artist');
	li.appendChild(artistName);
	artistName.textContent = trackData.artists.map(a => a.name).join(', ');

	// var albumName = document.createElement('span');
	// li.appendChild(albumName);
	// albumName.textContent = trackData.album.name;

	var addedBy = document.createElement('div');
	addedBy.classList.add('tracklist__track-addedby');
	li.appendChild(addedBy);

	var addedByImg = document.createElement('img');
	addedByImg.classList.add('tracklist__track-addedby-profilepic');
	addedByImg.src = trackData.addedBy.profilePic;
	addedBy.appendChild(addedByImg);

	var addedByName = document.createElement('span');
	addedBy.appendChild(addedByName);

	if (trackData.addedBy.displayName) {
		addedByName.textContent = trackData.addedBy.displayName.split(" ")[0];
	} else {
		addedByName.textContent = trackData.addedBy.username;
	}

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
		removeButtonIcon.src = '/icons/close.svg';

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
		likeButtonIcon.src = '/icons/heart.svg';
	}

	iso.appended(li);
	iso.layout();
	checkmarkToggle(trackData.id, true);


});

function checkmarkToggle(trackId, state) {
	console.log(trackId);
	var addedTrack = document.querySelectorAll('[data-trackid="' + trackId + '"]');
	console.log(addedTrack);
	for (var i = 0; i < addedTrack.length; i++) {
		var addedTrackButton = addedTrack[i].querySelector('.track-add-button');
		var addedTrackButtonIcon = addedTrackButton.querySelector('.icon');
		if (state === true) {
			//Add check to added track
			addedTrackButton.disabled = true;
			addedTrackButtonIcon.src = "/icons/check.svg";
		} else {
			addedTrackButton.disabled = false;
			addedTrackButtonIcon.src = "/icons/add.svg";
		}
	}
}


socket.on('joinPlaylist', function(currentUser, activeUsers) {
	var currentusersElements = document.querySelectorAll('.current-user');
	console.log(currentusersElements);
	console.log(currentUser.spotifyId);
	var duplicate;

	for (var i = 0; i < currentusersElements.length; i++) {
		if (currentUser.spotifyId === currentusersElements[i].getAttribute('data-id')) {
			return true;
		} else {
			return false;
		}
	}
	if (true) {
		createEl();
	}
	console.log(currentUser);

	function createEl() {
		var currentusers = document.querySelector('.playlist-currentusers__list');
		var currentusersAmount = document.querySelector('.playlist-currentusers__amount');
		var currentusersAmountTab = document.querySelector('.tab-users');

		currentusersAmount.textContent = activeUsers.length + " Users";
		currentusersAmountTab.textContent = activeUsers.length + " Users";

		var li = document.createElement('li');
		li.classList.add('current-user');
		li.setAttribute("data-id", currentUser.spotifyId);
		currentusers.appendChild(li);

		var profilePic = document.createElement('img');
		li.appendChild(profilePic);

		if (currentUser.profilePic) {
			profilePic.src = currentUser.profilePic;
		} else {
			profilePic.src = "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";
		}

		var userName = document.createElement('p');
		li.appendChild(userName);

		if (currentUser.displayName) {
			userName.textContent = currentUser.displayName.split(" ")[0];
		} else {
			userName.textContent = currentUser.username;
		}
		console.log(currentUser.username, 'joined');
	}
});

socket.on('showActiveUsers', function(activeUsers) {

	var currentusers = document.querySelector('.playlist-currentusers__list');
	var currentusersElements = document.querySelectorAll('.current-user');
	var currentusersAmount = document.querySelector('.playlist-currentusers__amount');
	var currentusersAmountTab = document.querySelector('.tab-users');
	currentusersAmount.textContent = activeUsers.length + " Users";
	currentusersAmountTab.textContent = activeUsers.length + " Users";

	//Create elements
	for (let i = 0; i < activeUsers.length; i++) {
		createEl(i);
	}

	//Remove duplicates
	for (var i = 0; i < activeUsers.length; i++) {
		for (var j = 0; j < currentusersElements.length; j++) {
			if (activeUsers[i].spotifyId === currentusersElements[j].getAttribute('data-id')) {
				console.log('same');
				currentusers.removeChild(currentusersElements[j]);
			}
		}
	}

	function createEl(i) {
		var li = document.createElement('li');
		li.classList.add('current-user');
		li.setAttribute('data-id', activeUsers[i].spotifyId);
		currentusers.appendChild(li);

		var profilePic = document.createElement('img');
		li.appendChild(profilePic);

		if (activeUsers[i].profilePic) {
			profilePic.src = activeUsers[i].profilePic;
		} else {
			profilePic.src = "https://upload.wikimedia.org/wikipedia/commons/8/89/Portrait_Placeholder.png";
		}

		var userName = document.createElement('p');
		li.appendChild(userName);

		if (activeUsers[i].displayName) {
			userName.textContent = activeUsers[i].displayName.split(" ")[0];
		} else {
			userName.textContent = activeUsers[i].username;
		}
	}

	console.log('activeUsers', activeUsers);
});

socket.on('leavePlaylist', function(currentUser, activeUsers) {
	console.log(currentUser.spotifyId, 'leaves');
	var currentusers = document.querySelectorAll('.current-user');
	var currentusersAmount = document.querySelector('.playlist-currentusers__amount');
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

var sectionSwitch;

if (document.querySelector('.tab-users')) {

	if (window.innerWidth <= 750) {
		var divs = document.querySelector("main").getElementsByTagName("section");
		divs[0].parentNode.insertBefore(divs[1], divs[0]);
		sectionSwitch = true;

		document.querySelector('.playlist-currentusers').classList.add("hidden");
	} else {
		sectionSwitch = false;
	}

	document.querySelector('.logo').classList.add("desktop");
	document.querySelector('.leave-playlist-button').classList.remove("hidden");

	document.querySelector('.tab-users').addEventListener("click", function(){
		document.querySelector('.playlist-currentusers').classList.remove("hidden");
    	document.querySelector('.tab-users').classList.add("active-tab");
		document.querySelector('.tab-queue').classList.remove("active-tab");
		document.querySelector('.tracklist').classList.add("hidden");
	});

	document.querySelector('.tab-queue').addEventListener("click", function(){
		document.querySelector('.playlist-currentusers').classList.add("hidden");
    	document.querySelector('.tab-users').classList.remove("active-tab");
		document.querySelector('.tab-queue').classList.add("active-tab");
		document.querySelector('.tracklist').classList.remove("hidden");
	});
}

window.onresize = function() {

	if (document.querySelector('.tab-users') && window.innerWidth > 750) {
		document.querySelector('.tab-users').classList.remove("active-tab");
		document.querySelector('.tab-queue').classList.add("active-tab");
		document.querySelector('.tracklist').classList.remove("hidden");
		document.querySelector('.logo').classList.remove("hidden");
		document.querySelector('.playlist-currentusers').classList.remove("hidden");

		if (sectionSwitch == true) {
			var divs = document.querySelector("main").getElementsByTagName("section");
			divs[0].parentNode.insertBefore(divs[1], divs[0]);
			sectionSwitch = false;
		}
	}

	if (document.querySelector('.tab-users') && window.innerWidth <= 750) {
		if (sectionSwitch == false) {
			document.querySelector('.playlist-currentusers').classList.add("hidden");
			var divs = document.querySelector("main").getElementsByTagName("section");
			divs[0].parentNode.insertBefore(divs[1], divs[0]);
			sectionSwitch = true;
		}
	}
}

if (location.hash === '#add-track') {
	document.querySelector('main').classList.add("hidden");
	document.querySelector('header').classList.add("hidden");
}

window.addEventListener("hashchange", function() {
	console.log(location.hash);

	if (location.hash === '#add-track') {
		window.scrollTo(0, 0);
		document.querySelector('main').classList.add("hidden");
		document.querySelector('header').classList.add("hidden");
	}
	else {
		document.querySelector('main').classList.remove("hidden");
		document.querySelector('header').classList.remove("hidden");
	}
});

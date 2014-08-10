var defaultImage = "C:\\Users\\Steyn\\Documents\\spotify-lockscreen\\lockscreen_img\\default.png";
var spotifyImage = "C:\\Users\\Steyn\\Documents\\spotify-lockscreen\\lockscreen_img\\spotify.png";
var pausedImage = "C:\\Users\\Steyn\\Documents\\spotify-lockscreen\\lockscreen_img\\paused.png";

var fs = require('fs');
var path = require('path');

var nodeSpotifyWebHelper = require('node-spotify-webhelper');
var request = require('request');

var profile = require('windows.system.userprofile');
var storage = require('windows.storage');

var spotify = new nodeSpotifyWebHelper.SpotifyWebHelper();


var lockScreenImageDir = path.join(__dirname, 'lockscreen_img');

if (!fs.existsSync(lockScreenImageDir)) {
	fs.mkdirSync(lockScreenImageDir);
}

var imageLocation = path.join(lockScreenImageDir, 'image.png');

function download(uri, filename, callback) {
	callback = callback || function () {};
	var st = request(uri).pipe(fs.createWriteStream(filename));
	st.on('close', callback);
	st.on('error', callback);
};


function setLockScreen(path, cb) {
	cb = cb || function() {}
	storage.StorageFile.getFileFromPathAsync(path, function(err, file) {
		if (err) {
			console.error('Error getting image file:', err);
			cb(err);
		}

		profile.LockScreen.setImageFileAsync(file, function(err) {
			if (err) {
				console.error('Error setting lock screen image:', err);
				return cb(err);
			}
			cb();
		});
	});
}


var currentArtistName;

function setLockScreenIfTrackChanged(cb) {

	var spotify = new nodeSpotifyWebHelper.SpotifyWebHelper();

	cb = cb || function() {};


	spotify.getStatus(function (err, res) {

		if (err) {
			console.info("Error, skipping");
			return cb();
		}

		if (!res || !res.track) {

			if (currentArtistName != "none") {
				console.info('No data, setting default');
				currentArtistName = "none";
				setLockScreen(defaultImage, function(err) {
					return cb();
				});
			}
		}

		else {

			if (res.playing) {

				if (currentArtistName === res.track.artist_resource.name) {
					return cb(null, false);
				}

				currentArtistName = res.track.artist_resource.name;
				

				var url = "https://api.spotify.com/v1/artists/";

				if (res.track.artist_resource.uri) {
					var url = url + res.track.artist_resource.uri.split(':')[2];
				}

				request(url, function (err, res, body) {

					if (err) {
						console.info('Error');
						return cb();
					}

					if (!body) {
						console.info('No image data, setting default');

						setLockScreen(spotifyImage, function(err) {
							return cb();
						});

					}
					
					var obj = JSON.parse(body);

					if (!obj.images) {

						console.info('No image data, setting default');

						setLockScreen(spotifyImage, function(err) {
							return cb();
						});
					}

					else {

						try {

							var imageUrl = obj.images[0].url;
							console.info('Setting lockscreen: ' + currentArtistName);

							download(imageUrl, imageLocation, function (err) {
								
								if (err) {
									console.info('error, skipping');
									return cb();
								}

								setLockScreen(imageLocation, function(err) {
									cb();
								});

							});

						}

						catch (err) {

							console.info('No image data, setting default');

							setLockScreen(spotifyImage, function(err) {
								return cb();
							});

						}

					}

				});
			}

			else {

				if (currentArtistName != "paused") {

					console.info('Spotify is paused, setting default');
					currentArtistName = "paused";

					setLockScreen(pausedImage, function(err) {
						return cb();
					});

				}

			}

		}

	});

};

setInterval(function () {
	setLockScreenIfTrackChanged();
}, 10000);

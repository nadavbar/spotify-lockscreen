var fs = require('fs');
var path = require('path');
var util = require('util');

var nodeSpotifyWebHelper = require('node-spotify-webhelper');
var request = require('request');
var cheerio = require('cheerio');

var profile = require('windows.system.userprofile');
var storage = require('windows.storage');

var spotify = new nodeSpotifyWebHelper.SpotifyWebHelper();

// make sure the directory in which we save the images exist
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

// sets the windows lockscreen to the current image path, using NodeRT modules
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

// holds the spotify uri of the track which is currently playing
var currentTrackUri;

// 1. Get the currently playing track information using SpotifyWebHelper
// 2. Check if the track that we got is different from the value in currentTrackUri - if not - return
// 3. If it's a new track:
//    3.1 scrape the track's web page and get the url of the image assocaited with the track
//    3.2 download the image and save it to file
//    3.3 set the downaloded image as the lockscreen
function setLockScreenIfTrackChanged(cb) {
  cb = cb || function() {};
  // get data regarding the track which is currently playing
  spotify.getStatus(function (err, res) {
    if (err) {
      return console.error(err);
    }

    if (!res || !res.track || !res.track.track_resource) {
      console.info('did not get any data from spotify, skipping');
      return cb();
    }
    
    // check if the track which is currently playing had changed
    if (currentTrackUri === res.track.track_resource.uri) {
      return cb(null, false);
    }

    console.info(util.format('setting new lockscreen for: "%s - %s"', res.track.artist_resource.name, res.track.track_resource.name));

    currentTrackUri = res.track.track_resource.uri;
    var url = res.track.track_resource.location.og;

    // scrape the spotify website and get url to the track's image
    request(url, function (err, res, body) {
      if (err) {
        return console.error(err);
      }

      if (!body) {
        console.info('did not get any image data, skipping');
        return cb();
      }

      // get the src of the track image
      var $ = cheerio.load(body);
      var imageElement = $('img[id=big-cover]')[0];

      if (!imageElement) {
        console.info('did not get any image data, skipping');
        return cb();
      }

      var imageUrl = imageElement.attribs.src;
      // download the image and set the lockscreen
      download(imageUrl, imageLocation, function (err) {
        if (err) {
          return console.error(err);
        }

        setLockScreen(imageLocation, function(err) {
          cb();
        });
      });
    });
  });
};


setInterval(function () {
  setLockScreenIfTrackChanged();
}, 15000);
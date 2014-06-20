var nodeSpotifyWebHelper = require('node-spotify-webhelper');
var request = require('request');
var fs = require('fs');
var cheerio = require('cheerio');
var path = require('path');
var profile = require('windows.system.userprofile');
var storage = require('windows.storage');

var spotify = new nodeSpotifyWebHelper.SpotifyWebHelper();

var imageLocation = path.join(__dirname, 'image.png');

function download(uri, filename, callback){
  request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
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

var currentTrackUri;

function setLockScreenIfSongChanged(cb) {
  cb = cb || function() {};
  // get the name of the song which is currently playing
  spotify.getStatus(function (err, res) {
    if (err) {
      return console.error(err);
    }
    
    if (currentTrackUri === res.track.track_resource.uri) {
      console.info('current song havn\'t changed');
      return cb(null, false);
    }

    console.info('we have a new song, setting a new lockscreen...');

    currentTrackUri = res.track.track_resource.uri;
    var url = res.track.track_resource.location.og;

    request(url, function (err, res, body) {
      if (err) {
        return console.error(err);
      }

      if (!body) {
        console.info('did not get any image data, skipping');
        return cb();
      }

      var $ = cheerio.load(body);
      var imageElement = $('img[id=big-cover]')[0];

      if (!imageElement) {
        console.info('did not get any image data, skipping');
        return cb();
      }

      var imageUrl = $('img[id=big-cover]')[0].attribs.src;
      download(imageUrl, imageLocation, function() { 
        setLockScreen(imageLocation, function(err) {
          console.info('lock screen was set successfully');
          cb();
        });
      });
    });
  });
};


setInterval(function () {
  setLockScreenIfSongChanged();
}, 15000);
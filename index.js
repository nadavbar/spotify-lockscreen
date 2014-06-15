var nodeSpotifyWebHelper = require('node-spotify-webhelper');
var request = require('request');
var cheerio = require('cheerio');
var fs = require('fs');
var profile = require('windows.system.userprofile');
var storage = require('windows.storage');

var spotify = new nodeSpotifyWebHelper.SpotifyWebHelper();

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
    console.info('Lock screen image was set successfully!');
    cb();
  });
});
}

// get the name of the song which is currently playing
spotify.getStatus(function (err, res) {
  if (err) {
    return console.error(err);
  }

  var url = res.track.track_resource.location.og;
  console.info('performing request on:', url);
  request(url, function(err, res, body) {
    $ = cheerio.load(body);
    var imageUrl = $('img[id=big-cover]')[0].attribs.src;
    download(imageUrl, 'c:\\temp\\image.png', function() { 
      console.info('downloaded!');
      setLockScreen('c:\\temp\\image.png', function(err) {
        console.info('done');
      });
    });
  });
});
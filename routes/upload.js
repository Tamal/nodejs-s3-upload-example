var express = require('express');
var router = express.Router();
var config = require('config');

/* POST upload/s3upload. */
router.post('/s3upload', function (req, res, next) {
  req.busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
    if (!filename)
      return;

    file.fileRead = [];
    file.on('data', function (chunk) {
      this.fileRead.push(chunk);
    });

    file.on('error', function (err) {
      console.log('Error while buffering the stream: ', err);
    });

    file.on('end', function () {
      // Concat the chunks into a Buffer
      var finalBuffer = Buffer.concat(this.fileRead);
      console.log('content lenght: ', finalBuffer.length);

      uploadFileToS3Bucket(
        finalBuffer,
        filename,
        config.s3BucketCredentials.folder.userProfileImages,
        finalBuffer.length,
        function (err, filename) {
          if (err) {
            res.send("Error uploading data");
            return;
          }

          var s3path = config.s3BucketCredentials.s3URL + '/' + config.s3BucketCredentials.folder.userProfileImages + '/' + filename;
          console.log(s3path)
          res.send("The file was saved to " + s3path);
        });

    });
  });

  req.busboy.on('error', function (err) {
    console.error('Error while parsing the form: ', err);
    next(err);
  });

  req.busboy.on('finish', function () {
    console.log('Done parsing the form!');
    // When everythin's done, render the view
    // next(null, 'http://www.google.com');
  });

  // Start the parsing
  req.pipe(req.busboy);
});

uploadFileToS3Bucket = function (stream, filename, folder, contentLength, callback) {
    var AWS = require('aws-sdk');
    var mime = require('mime')

    AWS.config.update({ accessKeyId: config.s3BucketCredentials.accessKeyId, secretAccessKey: config.s3BucketCredentials.secretAccessKey });
    var s3bucket = new AWS.S3();
    var params = {
        Bucket: config.s3BucketCredentials.bucket,
        Key: folder + '/' + filename,
        Body: stream,
        ACL: 'public-read',
        ContentType: mime.lookup(filename),
        ContentLength: contentLength
    };

    s3bucket.upload(params, function (err, data) {
        if (err) {
            console.log("Uploading image error: ", err);
            return callback(err);
        } else {
            return callback(null, filename);
        }
    });
};

module.exports = router;

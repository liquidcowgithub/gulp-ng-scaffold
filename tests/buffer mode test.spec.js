var assert = require('assert');
var es = require('event-stream');
var File = require('vinyl');
var prefixer = require('../');

describe('gulp-prefixer', function() {
  describe('in buffer mode', function() {

    it('should prepend text', function(done) {

      // create the fake file
      var fakeFile = new File({
        contents: new Buffer('abufferwiththiscontent')
      });

      // Create a prefixer plugin stream
      var myPrefixer = prefixer('prependthis');

      // write the fake file to it
      myPrefixer.write(fakeFile);

      // wait for the file to come back out
      myPrefixer.once('data', function(file) {
        // make sure it came out the same way it went in
        assert(file.isBuffer());

        // check the contents
        assert.equal(file.contents.toString('utf8'), 'prependthisabufferwiththiscontent');
        done();
      });

    });

  });
});
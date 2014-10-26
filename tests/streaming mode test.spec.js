var assert = require('assert');
var es = require('event-stream');
var File = require('vinyl');
var prefixer = require('../');

describe('gulp-prefixer', function() {
  describe('in streaming mode', function() {

    it('should prepend text', function(done) {

      // create the fake file
      var fakeFile = new File({
        contents: es.readArray(['stream', 'with', 'those', 'contents'])
      });

      // Create a prefixer plugin stream
      var myPrefixer = prefixer('prependthis');

      // write the fake file to it
      myPrefixer.write(fakeFile);

      // wait for the file to come back out
      myPrefixer.once('data', function(file) {
        // make sure it came out the same way it went in
        assert(file.isStream());

        // buffer the contents to make sure it got prepended to
        file.contents.pipe(es.wait(function(err, data) {
          // check the contents
          assert.equal(data, 'prependthisstreamwiththosecontents');
          done();
        }));
      });

    });

  });
});
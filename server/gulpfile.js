const gulp = require('gulp');
const nodemon = require('gulp-nodemon');

const debuggerPort = '9230';

gulp.task('serve', function() {
  nodemon({
    execMap: {
      js: `/usr/bin/lsof -i tcp:${debuggerPort} | grep LISTEN | awk '{print $2}' | xargs kill -9; node --inspect=0.0.0.0:${debuggerPort}`
    },
    script: './src/index.js',
    debug: true,
    ext: 'js',
    args: [ '--debug' ],
  }).on('restart', function() {
    console.log('================================================');
    console.log(`       RESTART > ${new Date().toISOString()}`);
    console.log('================================================');
  });
});

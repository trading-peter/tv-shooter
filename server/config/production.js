module.exports = {
  server: {
    port: 3000,
    host: '0.0.0.0'
  },
  plugins: {
    good: {
      ops: {
        interval: 1000
      },
      reporters: {
        consoleReporter: [{
          module: '@hapi/good-squeeze',
          name: 'Squeeze',
          args: [{ log: '*', error: '*' }]
        }, {
          module: '@hapi/good-console'
        }, 'stdout']}
    },
    shooter: {
      username: process.env.TV_USERNAME,
      password: process.env.TV_PASSWORD,
      signalSecret: process.env.SIGNAL_SECRET,
      width: 1980,    // Width as to account for the trading view sidebar. That's why screenshots are actually narrower than this value.
      height: 1000
    }
  }
}

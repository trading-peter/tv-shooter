'use strict';

const Hapi = require('@hapi/hapi');
const Path = require('path');
const Config = require(Path.join('..', 'config', process.env.CONFIG));

const registerPlugins = async server => {
  await server.register({ plugin: require('@hapi/good'), options: Config.plugins.good });
  await server.register({ plugin: require('./shooter'), options: Config.plugins.shooter });
}

async function boot() {
  const server = Hapi.server(Config.server);
  await registerPlugins(server);

  await server.start();

  server.log([ 'server', 'info' ], `Server running at: ${server.info.uri}`);
  return server;
}

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

// Useful for testing.
module.exports = exports = (function() {
  boot();
})();



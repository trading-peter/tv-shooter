'use strict';

const Shooter = new class {
  async register(server, options) {
    server.route(require('./routes')(server, options));
  }
}

module.exports = {
  register: Shooter.register.bind(Shooter),
  name: 'shooter',
  version: '1.0.0'
}

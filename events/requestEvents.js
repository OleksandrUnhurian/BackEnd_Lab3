const EventEmitter = require('events');

class RequestEvents extends EventEmitter {}

module.exports = new RequestEvents();

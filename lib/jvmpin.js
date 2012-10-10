/*
 * JVMPin - Nailgun protocol implementation
 *
 * Copyright(c) 2012 Foldr
 * EPL Licensed
 */

var util   = require('util'),
    stream = require('stream'),
    buffer = require('buffer'),
    net    = require('net');

/*final*/ var CHUNK_TYPE = {
	ARGUMENT:          'A',
	ENVIRONMENT:       'E',
	WORKING_DIRECTORY: 'D',
	COMMAND:           'C',
	STDIN:             '0',
	STDOUT:            '1',
	STDERR:            '2',
	EOF:               '.',
	EXIT:              'X'
}

exports.CHUNK_TYPE = CHUNK_TYPE;
exports.Create = function(options) {
  return new JVMPin(options);
};

/**
 * The JVMPin instance
 * 
 * The options argument is an object containing the following configuration
 * options: 
 * {
 *   args: {},    // arguments passed to ng. Object, defaults to process.argv.
 *   env: {},     // environment variables.  Object, defaults to process.env.
 *   cwd: '/tmp'  // current working directory. String, defaults to process.cwd.
 * }
 */
function JVMPin(options) {
	JVMPin.super_.apply(this, arguments);
	var options = options || {};
	this.args = options.args || process.argv.slice(1, process.argv.length);
	this.env  = options.env  || process.env;
	this.cwd  = options.cwd  || process.cwd();
}
util.inherits(JVMPin, net.Socket);

/**
 * Unlike the Socket connection the JVMPin enforces an object to be parsed instead
 * of an arguments list for explicity specifying hostname, port & cmd. Alternatively
 * the first parameter can be the cmd string if all defaults will suffice.
 * 
 * The following connection options can be provided:
 * {
 *   host: 'localhost'  , // hostname.     String, defaults to 'localhost'.
 *   port: 2113         , // port number.  Number, defaults to 2113.
 *   cmd: 'package.Nail'  // the java class to call. String, Requried.
 * }
 *
 * The second argument is a callback function which will be invoked when a connection
 * is made to the nailgun server.
 */
JVMPin.prototype.connect_ = function(options, cb) {
	this.host = 'localhost';
	this.port = 2113;

	if (typeof options === 'object') {
		this.host = options.host || this.host;
		this.port = options.port || this.port;
		this.cmd  = options.cmd;
	} else if (typeof options === 'string') {
		this.cmd = options;
	}

	if (this.cmd === undefined) {
		throw new Error("No cmd argument provided");
	}

	this.connect(this.port, this.host, cb);

	var self = this;
	// send the process and environment data
	this.on('connect', function(socket) {
		// Send argument chunks
		self.args.forEach(function(arg) {
			JVMPin.prototype._writeChunk(CHUNK_TYPE.ARGUMENT, arg);
		});

		// Send environment chunks
		for (key in process.env) {
			JVMPin.prototype._writeChunk(CHUNK_TYPE.ENVIRONMENT, key + '=' + process.env[key]);
		}

		// Send working dir chunk
		JVMPin.prototype._writeChunk(CHUNK_TYPE.WORKING_DIRECTORY, self.cwd);

		// Finally send the `java` command
		JVMPin.prototype._writeChunk(CHUNK_TYPE.COMMAND, self.cmd);
	});

	return this;
}

/**
 * _writeChunk(chunkType, data, [encoding], [callback])
 *
 * Writes data to the socket using the nailgun chunk protocol data.
 */
JVMPin.prototype._writeChunk = function(chunkType, data, arg1, arg2) {
	var encoding, cb;

	if (arg1) {
		if (typeof arg1 === 'string') {
			encoding = arg1;
			cb = arg2;
		} else if (typeof arg1 === 'function') {
			cb = arg1;
		} else {
			throw new Error('bad argument type');
		}
	}

	if (typeof data === 'string') {
		data = new Buffer(data, encoding || 'utf8');
	} else if (!Buffer.isBuffer(data)) {
		throw new TypeError('First argument must be a buffer or a string.');
	}

	// insert the 'chunk' nailgun protocol specifics
	var chunk = new Buffer(5 + data.length);
	chunk.writeUInt32BE(data.length, 0);
	chunk.write(chunkType, 4, 'ascii');
	data.copy(chunk, 5, 0);

	// If we are still connecting, then buffer this for later.
	if (this._connecting) {
		this._connectQueueSize += chunk.length;
	if (this._connectQueue) {
		this._connectQueue.push([chunk, encoding, cb]);
	} else {
		this._connectQueue = [[chunk, encoding, cb]];
	}
		return false;
	}

	return this._write(chunk, encoding, cb);
}
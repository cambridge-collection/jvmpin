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
exports.connect = exports.createConnection = function() {
  var args = normalizeConnectArgs(arguments);
  var s = new JVMPin(args[0]);
  return JVMPin.prototype.connect.apply(s, args);
};

/**
 * A Read stream used by the JVMPin API to get results/state from the nailgun instance
 */
function IncommingMessage(socket) {
	Stream.call(this);

	this.client = socket;
	this.readable = true;
	this._chunkType = undefined;
}
util.inherits(IncommingMessage, stream);

/**
 * The JVMPin instance
 */
function JVMPin(options) {
	net.Socket.call(this);
}
util.inherits(JVMPin, net.Socket);

// To maintain consistent parameter parsing with nodejs's socket api we also provide
// the option to parse in arguments under the following syntactic rules:
//    connect(cmd, [port], [host], [cb])
function normalizeConnectArgs(args) {
	var options = {
		port: 2113,
		host: 'localhost'
	};

	if (typeof args[0] === 'object') {
		options = args[0]
	} else {
		options.cmd = args[0];
		if (args.length > 1) {
			if (typeof args[1] === 'string') { // host or port
				options.host = args[1]; // host
			} else {
				options.port = args[1]; // port
				if (args.length > 2) {  // host
					options.host = args[2];
				}
			}
		}  
	}

	var cb = args[args.length - 1];
	return (typeof cb === 'function') ? [options, cb] : [options];
}

JVMPin.prototype.connect = function(options, cb) {
	if (typeof options !== 'object') {
		return net.Socket.prototype.connect.apply(this, normalizeConnectArgs(arguments));
	}

	net.Socket.prototype.connect(options, cb);

	// send the process and environment data
	this.on('connect', function(socket) {
		// Send argument chunks
		/*for (key in process.argv) {
			JVMPin.prototype.writeChunk(CHUNK_TYPE.ARGUMENT, process.argv[key]);
		}*/
		
		// Send environment chunks
		for (key in process.env) {
			JVMPin.prototype.writeChunk(CHUNK_TYPE.ENVIRONMENT, key + '=' + process.env[key]);
		}

		// Send workind dir chunk
		JVMPin.prototype.writeChunk(CHUNK_TYPE.WORKING_DIRECTORY, process.execPath);

		// Finally send the `java` command
		JVMPin.prototype.writeChunk(CHUNK_TYPE.COMMAND, options.cmd);
	});

	return this;
}

JVMPin.prototype.writeChunk = function(chunkType, data, arg1, arg2) {
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
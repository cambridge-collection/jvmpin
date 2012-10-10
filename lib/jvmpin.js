/*
 * JVMPin - Nailgun protocol implementation
 *
 * A simple node based implementation of the Nailgun protocol for communicating
 * with a JVM hosting a Nailgun server instance.
 * 
 * API Version 1.0.0
 *
 * Copyright(c) 2012 Foldr
 * EPL Licensed
 */
var util     = require('util'),
    buffer   = require('buffer'),
    net      = require('net');

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

/**
 * The protocol communicates via chunks. Each chunk has a particular type
 * associated. These are represented in the CHUNK_TYPE data structure.
 */ 
exports.CHUNK_TYPE = CHUNK_TYPE;

/**
 * Factory function to create a communication socket to the nailgun host.
 *
 * usage:
 *    require('jvmpin').createConnection('java.package.Main');
 *
 *    require('jvmpin').createConnection({
 *      port: 1234,
 *      host: 'some.domain',
 *      cwd: '/tmp',
 *      cmd:'java.package.Main'
 *    });
 *
 *    require('jvmpin').createConnection({
 *      host: 'some.domain'
 *    }, function() {
 *      console.log('connected');
 *    });
 *
 * The first argument is either the 'cmd' (java Main class or nail) you are
 * executing or an aggrigated object of configuration options used by the socket
 *  @see http://nodejs.org/api/net.html#net_class_net_socket
 *  @see JVMPin
 *  @see JVMPin.prototype.connect
 *
 * The second argument is the callback function to use on a successful connection.
 *
 * Example of using the code:
 *   var jvmpin = require('jvmpin');
 *   var client = jvmpin.createConnection('io.foldr.ngtesthost.Stdout')
 *     .on('data', function(data) {
 *       var chunk = jvmpin.readChunk(data);
 *       switch (chunk.type) {
 *         case jvmpin.CHUNK_TYPE.STDOUT: console.log(chunk.data); break;
 *         case jvmpin.CHUNK_TYPE.STDERR: console.error(chunk.data); break;
 *         default: console.trace(chunk.type + " - " + chunk.data);
 *       }
 *     }).on('end', function() {
 *       console.log('disconnected from server');
 *     }).on('error', function(e) {
 *       console.log('connection error', e);
 *     });
 */
exports.createConnection = function() {
	return JVMPin.prototype.connect.apply(new JVMPin(arguments), arguments);
};

/**
 * 
 */
exports.readChunks = readChunks = function(bufferData) {
	if (bufferData.length < 5) {
		throw new Error("Unable to read chunk");
	}

	var chunkSize = bufferData.readUInt32BE(0),
	    segLength = 5 + chunkSize;
	    chunkData = bufferData.slice(5, segLength),
	    chunkCode = bufferData.toString('ascii', 4, 5),
	    chunkType = Object.keys(CHUNK_TYPE).filter(function(key) {
	    	return CHUNK_TYPE[key] === chunkCode;
	    })[0],
	    chunkSegment = [{ type: chunkType, data: chunkData }];

	if (bufferData.length > segLength) {
		return chunkSegment.concat(readChunks(bufferData.slice(segLength)));
	}

	return chunkSegment;
}

/**
 * The JVMPin instance
 * 
 * The options argument is an object containing the following configuration
 * options: 
 * {
 *   args: [],    // arguments passed to ng. Array, defaults to process.argv.
 *   env: {},     // environment variables. Object, defaults to process.env.
 *   cwd: '/tmp'  // current working directory. String, defaults to process.cwd.
 *   
 *   // Options for socket @see http://nodejs.org/api/net.html#net_class_net_socket.
 *   fd: null
 *   type: null
 *   allowHalfOpen: false
 * }
 */
function JVMPin(options) {
	JVMPin.super_.apply(this, arguments);
	var options = options || {};
	this.args = options.args || process.argv.slice(2);
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
 *   cmd: 'package.Nail'  // the java class to call. String, Requried.
 *
 *   // Options for socket connection see
 *   // http://nodejs.org/api/net.html#net_socket_connect_port_host_connectlistener
 *   host: 'localhost'  , // hostname.     String, defaults to 'localhost'.
 *   port: 2113         , // port number.  Number, defaults to 2113.
 * }
 *
 * The second argument is a callback function which will be invoked when a connection
 * is made to the nailgun server.
 */
JVMPin.prototype.connect = function(options, cb) {
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

	var self = this;
	net.Socket.prototype.connect(this.port, this.host, function() {
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

	if (cb !== undefined) {
		this.on('connect', cb)
	}

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

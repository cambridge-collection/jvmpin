/**
 * JVMPin - Nailgun protocol implementation
 *
 * A simple node based implementation of the Nailgun protocol for communicating
 * with a JVM hosting a Nailgun server instance.
 * 
 * @since 1.0.0
 *
 * Copyright(c) 2012 Foldr
 * EPL Licensed
 */
var util = require('util'),
    net  = require('net');

/**
 * createConnection([port], [host], [connectionCallback])
 *
 * Factory function to create a communication socket to the nailgun host and
 * bind it to a new JVMPin instance. By default it sets the port to 2113 and
 * the host to 'localhost'.
 *
 * usage:
 *    require('jvmpin').createConnection(1234, 'some.host', function() {
 *      console.log('connected');
 *    });
 *
 * The API follows that used by the the net.Socket Class.
 * @see http://nodejs.org/api/net.html#net_class_net_socket for more details.
 *
 * @param port - Number.   The port number to connect to the nailgun jvm instance.
 * @param host - String.   The hostname to use when connecting to the nailgun jvm instance.
 * @param cb   - Function. A callback function to invoke on connection.
 */
exports.createConnection = function() {
	// test arguments for defaulting the host/port
	var port = arguments[0] || 2113;
	    host = arguments[1] || 'localhost';

	return new JVMPin(net.createConnection(port, host, arguments[2]));
};

/**
 * new JVMPin(socket)
 *
 * The JVMPin instance can be viewed as an instance of a socket specialized for
 * communication to a Nailgun hosted jvm instance. All events used by the internal
 * net.Socket are proxied via this class.
 * 
 * @param socket - Socket. An instance of a socket to communicate over.
 */
function JVMPin(socket) {
	JVMPin.super_.apply(this, arguments);
	
	// The communication channel to the Nailgun JVM instance.
	this._socket = socket
	
	// Data events can be emitted without a complete chunk hence a simple buffer is used.
	this._unprocessedBuffer = new Buffer(0);

	// Whenever a listener is registered to this object it will be forwarded to the socket.
	var self = this;
	this.on('newListener', function(event, listener) {
		self._socket.on(event, listener);
	});

	this.CHUNK_TYPE = {
		ARGUMENT:          'A',
		ENVIRONMENT:       'E',
		WORKING_DIRECTORY: 'D',
		COMMAND:           'C',
		STDIN:             '0',
		STDOUT:            '1',
		STDERR:            '2',
		EOF:               '.',
		EXIT:              'X'
	};

	/**
	 * readChunks(bufferData)
	 *
	 * Reads the passed in bufferData and processes any complete chunks. All unprocessed
	 * chunk data is then moved to the _unprocessedBuffer.
	 *
	 * NOTE:
	 * This could use some optimizations by promoting a mixture of concat and a pointer
	 * arithmetic for writing directly into the buffer. (perhaps look at using a stream)
	 * 
	 * @param bufferData - Buffer. A buffer object containing raw packet data to process.
	 * @return Array of Objects with 'type' and 'data' properties. The type property is
	 *          a CHUNK_TYPE identifier while the data is the processed chunk data.
	 */
	this.readChunks = function(bufferData) {
		self._unprocessedBuffer = Buffer.concat([self._unprocessedBuffer, bufferData]);

		if (self._unprocessedBuffer.length < 5) { // need more before reading chunk head
			return [];
		}

		var chunkSize = self._unprocessedBuffer.readUInt32BE(0),
		    chunkCode = self._unprocessedBuffer.toString('ascii', 4, 5);

		if (chunkSize + 5 > self._unprocessedBuffer.length) { // need more before reading chunk data
			return [];
		}

		var chunkEnd  = 5 + chunkSize,
		    chunkData = self._unprocessedBuffer.slice(5, chunkEnd),
		    unprocessedChunkData = self._unprocessedBuffer.slice(chunkEnd);

		self._unprocessedBuffer = self._unprocessedBuffer.slice(0, 0); // drain the _unprocessedBuffer.

		if (unprocessedChunkData.length > 0) {
			return [{ type: chunkCode, data: chunkData }].concat(self.readChunks(unprocessedChunkData));
		}

		return [{ type: chunkCode, data: chunkData }];
	};

	/**
	 * writeChunk(chunkType, data, [callback])
	 *
	 * Writes data to the socket using the nailgun chunk protocol data.
	 * 
	 * @param chunkType - CHUNK_TYPE. Sets the chunk type identifier.
	 * @param data      - String | Buffer. Sets the chunk data. (with ascii encoding).
	 * @param cb        - Function. Called when the data is writen to the socket.
	 * @return Boolean. If the full chunk is written returns true, otherwise false.
	 */
	this.writeChunk = function (chunkType, data, cb) {
		var chunkHead = new Buffer(5);
		    chunkData = (typeof data === 'string') ? new Buffer(data) : data;

		chunkHead.writeUInt32BE(data.length, 0);
		chunkHead.write(chunkType, 4, 'ascii');

		return self._socket.write(Buffer.concat([chunkHead, chunkData]), cb);
	};

	/**
	 * spawn(command, [args], [options])
	 *
	 * NOTE Currently this binds stdin/stdout/stderr to the currently executing process.
	 *      This will eventually be changed soon and instead a child process will be bound.
	 *
	 * @param command - String. The 'nail' or main java class to execute.
	 * @param args    - Array. A list of arguments to send the command. (empty by default)
	 * @param options - Object A set of possible options to send to the process. Object keys
	 *                  of note are the 'cwd' which default to process.cwd() and 'env' which
	 *                  defaults to porcess.env.
	 */
	this.spawn = function(command, args, options) {
		if (typeof command !== 'string') {
			throw new Error("Unable to spawn command: ", command);
		}

		var args = args || []
		    options = options || {},
		    options.env = options.env || process.env,
		    options.cwd = options.cwd || process.cwd();

		// protocol handshake
		args.forEach(function(arg) {
			writeChunk(CHUNK_TYPE.ARGUMENT, args);
		});
		self.writeChunk(self.CHUNK_TYPE.ENVIRONMENT, 'NAILGUN_FILESEPARATOR=' + (require('os').type() === 'Windows_NT' ? ';' : ':'));
		self.writeChunk(self.CHUNK_TYPE.ENVIRONMENT, 'NAILGUN_PATHSEPARATOR=' + require('path').sep);
		for (key in options.env) {
			self.writeChunk(self.CHUNK_TYPE.ENVIRONMENT, key + '=' + options.env[key]);
		}
		self.writeChunk(self.CHUNK_TYPE.WORKING_DIRECTORY, options.cwd);
		self.writeChunk(self.CHUNK_TYPE.COMMAND, command);

		self._socket.on('data', function(data) {
			var chunk = self.readChunks(data).forEach(function(chunk) {
				switch (chunk.type) {
					case self.CHUNK_TYPE.STDOUT:
						process.stdout.write(chunk.data.toString());
						break;
					case self.CHUNK_TYPE.STDERR:
						process.stderr.write(chunk.data.toString());
						break;
					case self.CHUNK_TYPE.EXIT:
						console.log('process exit requested, exit code:', chunk.data.toString());
						process.exit(chunk.data.toString());
						break;
					default:
						console.error("Unexpected chunk type", chunk.type, chunk.data.toString());
				}
			});
		}).on('end', function() {
			console.log('server closed connection');
		}).on('close', function() {
			console.log('connection closed');
		});

		// TODO: now bind io redirection
		// return new JVMPinProcess().stdin -> jvmpin.inputBuffer
		//            JVMPinProcess().stdin.eol -> jvmpin.sendInputbuffer.
		//            JVMPinProcess().stderr <- jvmpin.message(Error(data));
		//            JVMPinProcess().stdout <- jvmpin.message(data));
		process.stdin.resume();
		process.stdin.setEncoding('ascii');
		process.stdin.on('data', function(data) {
			self.writeChunk(self.CHUNK_TYPE.STDIN, data);
		}).on('end', function() {
			self.writeChunk(self.CHUNK_TYPE.EOF, "");
		});
	};
}
util.inherits(JVMPin, require('events').EventEmitter);

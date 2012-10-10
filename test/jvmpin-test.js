/*
 * JVMPin - Nailgun protocol implementation
 *
 * Test cases for API version 1.x
 *
 * Copyright(c) 2012 Foldr
 * EPL Licensed
 */
var jvmpin = require('../lib/jvmpin');

function basicArgumentsTest() {
	var client = jvmpin.createConnection({
		port: 2113,
		cmd:'io.foldr.ngtesthost.Stdout'
	}, function() {
		console.log('ok');
	});

	client = jvmpin.createConnection('io.foldr.ngtesthost.Stdout');

	client = jvmpin.createConnection('io.foldr.ngtesthost.Stdout', function() {
		console.log('ok');
	});

	client.on('data', function(data) {
		console.log(data.toString());
	});

	client.on('end', function() {
		console.log('client disconnected');
	});

	client.on('error', function(e) {
		console.error('error');
	});
}

function basicChunkReading() {
	var client = jvmpin.createConnection('io.foldr.ngtesthost.Stdout')
		.on('data', function(data) {
			var chunk = jvmpin.readChunk(data);
			switch (chunk.type) {
				case jvmpin.CHUNK_TYPE.STDOUT: console.log(chunk.data.toString()); break;
				case jvmpin.CHUNK_TYPE.STDERR: console.error(chunk.data.toString()); break;
				default: console.log(chunk);
			}
		}).on('end', function() {
			console.log('disconnected from server');
		}).on('error', function(e) {
			console.log('connection error', e);
		});
}

function basicCommunication() {
	var client = jvmpin.createConnection('io.foldr.ngtesthost.Stdin', function() {
			console.log("connected");
		}).on('data', function(data) {
			var chunk = jvmpin.readChunk(data);
			switch (chunk.type) {
				case jvmpin.CHUNK_TYPE.STDOUT: console.log(chunk.data.toString()); break;
				case jvmpin.CHUNK_TYPE.STDERR: console.error(chunk.data.toString()); break;
				default: console.log(chunk);
			}
		}).on('end', function() {
			console.log('disconnected from server');
		}).on('error', function(e) {
			console.log('connection error', e);
		});

	process.stdin.on('data', function(data) {
		client.write(data)
	});
}

basicCommunication();
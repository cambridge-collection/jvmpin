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
			var chunks = jvmpin.readChunks(data);
			chunks.forEach(function(chunk) {
				switch (chunk.type) {
					case jvmpin.CHUNK_TYPE.STDOUT: console.log(chunk.data); break;
					case jvmpin.CHUNK_TYPE.STDERR: console.error(chunk.data); break;
					default: console.log(chunk.type + " - " + chunk.data,toString());
				}
			});
		}).on('end', function() {
			console.log('disconnected from server');
		}).on('error', function(e) {
			console.log('connection error', e);
		});
}

basicChunkReading();
/*
 * JVMPin - Nailgun protocol implementation
 *
 * Copyright(c) 2012 Foldr
 * EPL Licensed
 */


var jvmpin = require('../lib/jvmpin');

var client = jvmpin.Create();

client.on('data', function(data) {
	console.log(data.toString());
});

client.on('end', function() {
	console.log('client disconnected');
});

client.on('error', function(e) {
	console.log('error');
	console.log(e);
});

client.connect_('io.foldr.ngtesthost.Stdout', function() {
		console.log('connected');
	});
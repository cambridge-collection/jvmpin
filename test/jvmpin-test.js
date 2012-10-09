/*
 * JVMPin - Nailgun protocol implementation
 *
 * Copyright(c) 2012 Foldr
 * EPL Licensed
 */

var jvmpin = require('../lib/jvmpin');


var client = jvmpin.connect({
	port: 2113,
	host: 'localhost',
	cmd: 'io.foldr.ngtesthost.Stdout'}, function() {
		console.log('connected');
	});

client.on('data', function(data) {
	console.log(data.toString());
});

client.on('end', function() {
	console.log('client disconnected');
});

client.on('error', function() {
	console.log('error');
})
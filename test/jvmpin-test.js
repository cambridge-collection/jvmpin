/*
 * JVMPin - Nailgun protocol implementation
 *
 * Test cases for API version 1.x
 *
 * Copyright(c) 2012 Foldr
 * EPL Licensed
 */
var jvmpin = require('../lib/jvmpin');

var client = jvmpin.createConnection({port: 2113, cmd:'io.foldr.ngtesthost.Stdout'}, function() { console.log('ok'); });

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
/*
 * JVMPin - Nailgun protocol implementation
 *
 * Test cases for API version 1.x
 *
 * To run this test case please start the java project found in the ng-testhost folder.
 * This sample should echo out all text sent to the server. (except `quit` which will
 * close the connection on the server)
 *
 * Copyright(c) 2012 Foldr
 * EPL Licensed
 */
var jvmpin = require('../lib/jvmpin');

var client = jvmpin.createConnection();
var proc = client.spawn('io.foldr.ngtesthost.Stdin');

proc.stdout.pipe(process.stdout);
proc.stderr.pipe(process.stderr);

process.stdin.pipe(proc.stdin);
proc.on('exit', function(c) { process.exit(); })

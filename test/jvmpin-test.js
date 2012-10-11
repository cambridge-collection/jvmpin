/*
 * JVMPin - Nailgun protocol implementation
 *
 * Test cases for API version 1.x
 *
 * Copyright(c) 2012 Foldr
 * EPL Licensed
 */
var jvmpin = require('../lib/jvmpin');

var process = jvmpin.createConnection().spawn('io.foldr.ngtesthost.Stdin');

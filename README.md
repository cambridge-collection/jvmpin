# JVMPin

JVMPin provides a nodejs implementation of the nailgun protocol.

Information about nailgun can be found at
[http://www.martiansoftware.com/nailgun/](http://www.martiansoftware.com/nailgun/).
While the nailgun native library and java dependencies can either be found at
[sourceforge](http://sourceforge.net/projects/nailgun/files/nailgun/) or
resolved via the [maven repository](http://ooo-maven.googlecode.com/hg/repository) using the dependency:
```xml
<dependency>
	<groupId>com.martiansoftware</groupId>
	<artifactId>nailgun</artifactId>
	<version>0.7.1</version>
</dependency>
```

## Usage

The JVMPin library can be installed via npm by adding the following to
your package.json's dependencies or devDependencies sections:
```json
"dependencies": {
	"jvmpin": "1.x"
}

```

You will need to start your nailgun instance in another process (this is
a task I leave to the reader).

Then simply connect to the nailgun instance using:
```javascript

var jvmpin = require('jvmpin');

var proc = jvmpin.createConnection(1234, 'localhost').spawn('your.main.Class');

// now to take over the currently running context by binding stdio
proc.stdout.pipe(process.stdout);
proc.stderr.pipe(process.stderr);

process.stdin.pipe(proc.stdin);
proc.on('exit', function(c) { process.exit(); })

```

For more information please consult the [API
Documentation](https://bitbucket.org/foldr/jvmpin/raw/master/lib/jvmpin.js)

## Contributors

[Eric McCarthy](http://limulus.net/)
[Markus Hedvall](https://bitbucket.org/markushedvall/)


## License

Copyright © 205 Benjamin Conlan

Distributed under the Eclipse Public License.

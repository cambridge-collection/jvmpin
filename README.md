# JVMPin

JVMPin provides a nodejs implementation of the nailgun protocol
providing communication to nailgun hosted java applications.

Information about nailgun can be found at
http://www.martiansoftware.com/nailgun/. While the nailgun native
library and java dependencies can either be found at
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
a task I leave to the reader.

Then simple connect to the nailgun instance using:
```javascript

var jvmpin = require('jvmpin');

jvmpin.createConnection(1234, 'localhost').spawn('your.main.Class');

```

This will bind the STDIO streams to the executing process. (something
that is yet to be corrected).

For more information please consult the [API
Documentation](https://bitbucket.org/foldr/jvmpin/raw/master/lib/jvmpin.js)

## License

Copyright © 2012 Foldr 

Distributed under the Eclipse Public License.

# JVMPin

JVMPin provides a nodejs protocol implementation of the nailgun protocol
for communication to nail gun hosted java applications.

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
	"io.foldr.jvmpin": "1.x"
}

```

## License

Copyright © 2012 Foldr 

Distributed under the Eclipse Public License.

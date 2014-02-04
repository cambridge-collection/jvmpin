# NG TestHost Application

The NG TestHost Application is a simple Nailgun application which is
used by the test scripts.

## Building

Building the NG TestHost application requires both the [JDK](http://www.oracle.com/technetwork/java/javase/downloads/)
as well as the [Maven](http://maven.apache.org/) build tool.

Simply run `mvn clean package` to create the TestHost Application. This will create
an `ng-testhost.zip` file in the `target` folder which you can extract.

## Running

To run the application from the extracted folder simply perform
`java -jar ng-testhost-1.0.0-SNAPSHOT.jar` from the extracted folders root.

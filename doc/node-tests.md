# Tests for the Node.js SDK

The Azure IoT SDKs team keeps a close watch on tests and code coverage when committing new code, whether it's for bugfixes or new features. The build is actually configured to fail if code coverage goes down.
We use [mocha](http://mochajs.org/) for our test framework, coupled with [chai](http://chaijs.com/) for assertions and [sinon](http://sinonjs.org/) for spies and fake timers when needed.
The code coverage is computed using [istanbul](https://gotwarlost.github.io/istanbul/) 

3 kinds of tests can be found in the Node.js SDK for Azure IoT:
- Unit tests
- Integration tests
- End-to-end tests

# Unit tests
We use unit-tests to guarantee the behavior of a specific component and help prevent unwanted side effects induced by refactoring.

- Each component that is defined in a `lib` folder of a package should have an associated set of unit tests in the `test` folder. This set of tests shall be named `_<component>_test.js`. 
- Unit tests should test only one component and not rely on external resources such as network or disk. 
- Unit tests should never block or wait and should run as fast as possible.

# Integration tests
We use integration tests to quickly verify that the SDK communicates with the Azure IoT Hub service properly.

- integration tests usually reside within the transport/protocol they are supposed to test (AMQP, HTTP, MQTT, etc)
- The files containing integration tests shall be named `_<component>_test_integration.js`.
- Those depend on external resources so special attention should be given to timeouts, and general stability.

# End-to-end tests
End-to-end tests are used to validate a complete scenario from the device to the service that relies Azure IoT Hub to collect data, send commands and manage those device.

The end-to-end tests can be found in the `/e2etests` folder. 

# Building and running tests
## Prerequisites
- Node.js v0.10 or higher
- OpenSSL

In most cases on Windows you will also need to define the OPENSSL_CONF environment variable and set it to point to your openssl.cnf file (should be in the OpenSSL folder). If it's not defined, the test setup script will let you know. 

## Create local links between packages
The purpose of this step is to create links between our packages in their respective `node_modules` folders instead of installing them from the npm global repository. Once this script is done, all package folders within the repository point to each other and you can start running the tests.



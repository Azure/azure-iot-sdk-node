# Samples for the Azure IoT Device Provisioning Device SDK for Node.js

This file can be found in https://github.com/Azure/azure-iot-sdk-node/tree/master/provisioning/device/samples

This folder contains simple samples showing how to use the various features of the Microsoft Azure IoT Device Provisioning Service from an application running JavaScript or TypeScript code.

## List of samples

* Register a device using an X509 individual enrollment.
   *  [register_x509.js][register-x509]

## Other example code
The [end-to-end tests][provisioning-e2e] for device provisioning also accomplish some of the same functionality.  Although these tests are not well documented, they can provide some insite into functionality.

## How to run the samples
In order to run the device samples you will first need the following prerequisites:
* Node.js v4 or above on your target device. (Check out [Nodejs.org](https://nodejs.org/) for more info)
* [Setup Azure IoT Device Provisioning ][lnk-setup-iot-provisioning] Stop before executing the the Create and provision a simulated device section.
* For X509 provisioning, you will need a device certificate.  If you are doing group provisioning, you will also need a CA certificate.

Get the following files from the current folder:
* [package.json][package-json]
* **__sample_file.js__** (where **__sample_file.js__** is one of the files listed above and available in this folder)

Place the files in the folder of your choice on the target machine/device then go through the following steps:

* From a shell or Node.js command prompt, navigate to the folder where you placed the sample files. Install the sample dependencies

```
$ npm install
```

### Creating X509 device certificates for individual enrollment
If you don't have PEM or CER files for your device along with the associated private key, you will need to create them.  There are 2 easy ways to do this:
1. Use the [PEM][pem-npm] module.  The following code snipped will create a certificate and key and save it to the filesystem.

When creating certificates, it is important that the commonName (CN) field matches the registrationId for the device you are enrolling.  Registration will fail if this field is not set correctly.

```
  var pem = require('pem');
  var fs = require('fs');

  var registrationId = process.argv[2].toLowerCase();

  // make sure directory exists
  var certPath = __dirname + "\\cert\\";

  var certOptions = {
    commonName: registrationId,
    selfSigned: true,
    days: 10
  };

  pem.createCertificate(certOptions, function (err, result) {
    if (err) {
      console.log (err);
    } else {
      fs.writeFileSync(certPath + registrationId + '-cert.pem', result.certificate);
      fs.writeFileSync(certPath + registrationId + '-key.pem', result.clientKey);
    }
  });

```

2. Alternately, you can use the Azure IoT C sdk, as documented [here][c-sdk-create-individual-enrollment]

### Registering a device using an X509 individual enrollment

When you have the device cert and key, you can proceeed to create an individual enrollment for your device.  You have a few options:
1. You can use the [create_individual_enrollment][service-sample-create-individual-enrollment] sample in the [provisioning service SDK samples][service-samples] to enroll with the service.  To use your x509 key, you need to update the enrollment object to contain your cert.  If your cert comes from a CER file, it needs to be base64 encoded.
```
    var enrollment = {
      registrationId: registrationId,
      deviceId: deviceId,
      attestation: {
        type: 'x509',
        x509: {
          clientCertificates: {
            primary: {
              certificate: cert
            }
          }
        }
      }
    };
```
2. Alternatively, You can use the Azure portal.  Instructions to accomplish this are [here][c-sdk-create-individual-enrollment], starting with the step labeled 'Add enrollment list entry'.

 After enrolling the device with the provisioning service, you can use [register_x509.js][register-x509] to register the device.  When running this sample, you'll need to replace the '[provisioning host]' '[id scope]', '[registration id'], '[cert filename]', and '[key filename]' values in the code with your specific values.

 If the registration succeeds, you should see the device Id and the assigned hub in the console output.  You should be able to connect to this hub with this device ID using the device cert and private key you created above.

## Read More
For more information on how to use this library refer to the documents below:
- [Prepare your node.js development environment][node-devbox-setup]
- [Setup IoT Hub][lnk-setup-iot-hub]
- [Provision devices][lnk-manage-iot-hub]
- [Node API reference][node-api-reference]

[lnk-setup-iot-provisioning]: https://docs.microsoft.com/en-us/azure/iot-dps/quick-setup-auto-provision
[lnk-setup-iot-hub]: https://aka.ms/howtocreateazureiothub
[lnk-manage-iot-hub]: https://aka.ms/manageiothub
[node-api-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iot-device/
[node-devbox-setup]: ../../doc/node-devbox-setup.md
[register-x509]: https://github.com/azure/azure-iot-sdk-node/tree/master/provisioning/device/samples/register_x509.js
[service-samples]: https://github.com/azure/azure-iot-sdk-node/tree/master/provisioning/service/samples/readme.md
[service-sample-create-individual-enrollment]: https://github.com/azure/azure-iot-sdk-node/tree/master/provisioning/service/samples/create_individual_enrollment.js
[package-json]: https://github.com/azure/azure-iot-sdk-node/tree/master/provisioning/device/samples/package.json
[pem-npm]: https://www.npmjs.com/package/pem
[provisioning-e2e]: https://github.com/azure/azure-iot-sdk-node/tree/master/provisioning/e2e
[c-sdk-create-individual-enrollment]: https://docs.microsoft.com/en-us/azure/iot-dps/quick-create-simulated-device-x509

# Samples for the Azure IoT Device Provisioning Device SDK for Node.js

This file can be found in https://github.com/Azure/azure-iot-sdk-node/tree/master/provisioning/device/samples

This folder contains simple samples showing how to use the various features of the Microsoft Azure IoT Hub Device Provisioning Service from an application running JavaScript or TypeScript code.

## List of samples

* Register a device using an X509 individual or group enrollment.
   *  [register_x509.js][register-x509]

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
Note: When creating certificates, it is important that the commonName (CN) field matches the registrationId for the device you are enrolling.  Registration will fail if this field is not set correctly.

If you don't have PEM or CER files for your device along with the associated private key, you will need to create them.  The easiest way to do this is via the create_test_cert.js script located in the [provisioning/tools][provisioning-tools] directory.  This tool allows you to:
1) Create a test self-signed device certificate for individual device enrollment.
2) Create a test root certificate and certificate change for group device enrollment.
3) Verify possession of a private key when required by the Azure portal.

### Registering a device using an X509 individual enrollment
When you have the device cert and key (possibly created using the [create_test_cert.js][provisioning-tools] script), you can proceeed to create an individual enrollment for your device.  You have a few options:
1. You can use the [create_individual_enrollment][service-sample-create-individual-enrollment] sample in the [provisioning service SDK samples][service-samples] to enroll with the service.  To use your x509 certificate, you need to update the enrollment object to contain your cert.  If your cert comes from a CER file, it needs to be base64 encoded.
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

 After enrolling the device with the provisioning service, you can use [register_x509.js][register-x509] to register the device.  When running this sample, you'll need to replace the '[provisioning host]' '[id scope]', '[registration id'], '[cert filename]', and '[key filename]' values in the code with your specific values. More information on Device Provisioning Concepts can be found [here][lnk-dps-concepts]

 If the registration succeeds, you should see the device Id and the assigned hub in the console output.  You should be able to connect to this hub with this device ID using the device cert and private key you created above.

### Registering a device using an X509 group enrollment
When you have a certificate change containing a root certificate and several optional intermediate CA certificates, (possibly created using the [create_test_cert.js][provisioning-tools] script), you can proceed to create a group enrollment for your device.  You have a few options:
1. You can use the [create_enrollment_gropup][service-sample-create-enrollment-group] sample in the [provisioning service SDK samples][service-samples] to enroll with the service.  To use your x509 certificate, you need to update the enrollment object to contain your cert (either the root certificate or one of your intermediate CA certificates).  If your cert comes from a CER file, it needs to be base64 encoded.

2. You can upload your group certificate to the Certificates tab in your Device Provisioning Service blade in the Azure portal and verify it.  You can find instructions [here][lnk-x509-verification-instructions].

At the very least, your root certificate needs to be uploaded to your Device Provisioning Service blade in the Azure portal, and it needs to be verified.

Once the group is created and the certificates have been uploaded and verified, you can use [register_x509.js][register-x509] to register the device.  When running this sample, you'll need to replace the '[provisioning host]' '[id scope]', '[registration id'], '[cert filename]', and '[key filename]' values in the code with your specific values.

When registering a device via group enrollment, the cert may need to include the certificate chain that links it back to a verified certificate.


## Read More
For more information on how to use this library refer to the documents below:
- [Prepare your node.js development environment][node-devbox-setup]
- [Setup IoT Hub][lnk-setup-iot-hub]
- [Provision devices][lnk-manage-iot-hub]
- [Node API reference][node-api-reference]
- [Overview of X.509 certificates][lnk-x509-ca-overview]

[lnk-setup-iot-provisioning]: https://docs.microsoft.com/en-us/azure/iot-dps/quick-setup-auto-provision
[lnk-setup-iot-hub]: https://aka.ms/howtocreateazureiothub
[lnk-manage-iot-hub]: https://aka.ms/manageiothub
[node-api-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iot-device/
[node-devbox-setup]: ../../doc/node-devbox-setup.md
[register-x509]: https://github.com/azure/azure-iot-sdk-node/tree/master/provisioning/device/samples/register_x509.js
[service-samples]: https://github.com/azure/azure-iot-sdk-node/tree/master/provisioning/service/samples/readme.md
[service-sample-create-individual-enrollment]: https://github.com/azure/azure-iot-sdk-node/tree/master/provisioning/service/samples/create_individual_enrollment.js
[service-sample-create-enrollment-group]: https://github.com/azure/azure-iot-sdk-node/tree/master/provisioning/service/samples/create_enrollment_group.js
[package-json]: https://github.com/azure/azure-iot-sdk-node/tree/master/provisioning/device/samples/package.json
[pem-npm]: https://www.npmjs.com/package/pem
[provisioning-e2e]: https://github.com/azure/azure-iot-sdk-node/tree/master/provisioning/e2e
[c-sdk-create-individual-enrollment]: https://docs.microsoft.com/en-us/azure/iot-dps/quick-create-simulated-device-x509
[lnk-dps-concepts]: https://docs.microsoft.com/en-us/azure/iot-dps/concepts-service
[provisioning-tools]: https://github.com/azure/azure-iot-sdk-node/tree/master/provisioning/tools
[lnk-x509-ca-overview]: https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-x509ca-overview
[lnk-x509-verification-instructions]: https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-security-x509-get-started#registercerts

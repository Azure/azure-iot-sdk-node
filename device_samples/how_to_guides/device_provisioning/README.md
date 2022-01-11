# Register and connect a device using the Device Provisioning service

These samples highlight the different ways to create a client. For simplicity, all proceeding samples will use the default **connection string** method. However, if you need to connect using an X509 certificate, web proxy, or shared access signature (sas), we got you covered.

# 🦉 Getting set up

Before you can run any of the samples, you will need to setup and configure a few things.

- [Setup IoT Hub and link to Device Provisioning Service](https://docs.microsoft.com/en-us/azure/iot-dps/quick-setup-auto-provision#prerequisites)
- [Setup your local environment](../../../doc/devicesamples/dev-environment.md)
- [Monitor activity (optional)](../../../doc/devicesamples/monitor-iot-hub.md)

# 🌟 Samples

### Provision a single device using symmetric key

This sample will show you how to register and connect a device using a symmetric key individual enrollment.

Before you can run the sample code, you need to [create an individual enrollment](https://docs.microsoft.com/en-us/azure/iot-dps/how-to-manage-enrollments#create-an-individual-enrollment). Next, you will need take some values from the Device Provissioning Service and the Individual Enrollment and put them into the following environment variables. [Click here](../../../doc/devicesamples/setting-env-variables.md) if you need help setting environment variables.

| Env variable                 | Description                                                     |
| :--------------------------- | :-------------------------------------------------------------- |
| PROVISIONING_HOST            | Default is `global.azure-devices-provisioning.net`              |
| PROVISIONING_IDSCOPE         | `ID Scope` from the Device Provision Service                    |
| PROVISIONING_REGISTRATION_ID | `Registration ID` from the individual enrollment                |
| PROVISIONING_SYMMETRIC_KEY   | `Primary Key` or `Secondary Key` from the individual enrollment |

#### Running the sample

From the `how_to_guides/device_provisioning` directory, run `node register_symkey.js`

```
Registration succeeded...
 assigned hub=iot-hub-name.azure-devices.net
 deviceId=67bcb780-7348-4564-8202-b35c7700d0df
Client connected
Send status: MessageEnqueued
```

### Provision a group of devices using symmetric key

This sample will show you how to register and connect a device using a symmetric key individual enrollment.

Before you can run the sample code, you need to [create an enrollment group](https://docs.microsoft.com/en-us/azure/iot-dps/how-to-manage-enrollments#create-an-enrollment-group). Next, you will need take some values from the Device Provissioning Service and the Group Enrollment and put them into the following environment variables. [Click here](../../../doc/devicesamples/setting-env-variables.md) if you need help setting environment variables.

| Env variable                 | Description                                                            |
| :--------------------------- | :--------------------------------------------------------------------- |
| PROVISIONING_HOST            | Default is `global.azure-devices-provisioning.net`                     |
| PROVISIONING_IDSCOPE         | `ID Scope` from the Device Provision Service                           |
| PROVISIONING_REGISTRATION_ID | This is the id for the device. By default it uses `my-first-device-id` |
| PROVISIONING_SYMMETRIC_KEY   | `Primary Key` or `Secondary Key` from the group enrollment             |

#### Running the sample

From the `how_to_guides/device_provisioning` directory, run `node register_symkeygroup.js`

```
Registration succeeded...
 assigned hub=iot-hub-name.azure-devices.net
 deviceId=67bcb780-7348-4564-8202-b35c7700d0df
Client connected
Send status: MessageEnqueued
```

### Registering a device using an X509 individual enrollment

This sample will show you how to register and connect a device using a symmetric key individual enrollment.

#### Creating X509 device certificates for individual enrollment

Note: When creating certificates, it is important that the commonName (CN) field matches the registrationId for the device you are enrolling. Registration will fail if this field is not set correctly.

If you don't have PEM or CER files for your device along with the associated private key, you will need to create them. The easiest way to do this is via the create_test_cert.js script located in the [provisioning/tools][provisioning-tools] directory. This tool allows you to:

1. Create a test self-signed device certificate for individual device enrollment.
2. Create a test root certificate and certificate change for group device enrollment.
3. Verify possession of a private key when required by the Azure portal.

#### Registering a device

When you have the device cert and key (possibly created using the [create_test_cert.js][provisioning-tools] script), you can proceeed to create an individual enrollment for your device. You have a few options:

1. You can use the [create_individual_enrollment][service-sample-create-individual-enrollment] sample in the [provisioning service SDK samples][service-samples] to enroll with the service. To use your x509 certificate, you need to update the enrollment object to contain your cert. If your cert comes from a CER file, it needs to be base64 encoded.

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

2. Alternatively, You can use the Azure portal. Instructions to accomplish this are [here][c-sdk-create-individual-enrollment], starting with the step labeled 'Add enrollment list entry'.

    After enrolling the device with the provisioning service, you can use [register_x509.js][register-x509] to register the device. When running this sample, you'll need to replace the '[provisioning host]' '[id scope]', '[registration id'], '[cert filename]', and '[key filename]' values in the code with your specific values. More information on Device Provisioning Concepts can be found [here][lnk-dps-concepts]

    If the registration succeeds, you should see the device Id and the assigned hub in the console output. You should be able to connect to this hub with this device ID using the device cert and private key you created above.

3. Finally, set the following environment variables. [Click here](../../../doc/devicesamples/setting-env-variables.md) if you need help setting environment variables.

    | Env variable                 | Description                                                            |
    | :--------------------------- | :--------------------------------------------------------------------- |
    | PROVISIONING_HOST            | Default is `global.azure-devices-provisioning.net`                     |
    | PROVISIONING_IDSCOPE         | `ID Scope` from the Device Provision Service                           |
    | PROVISIONING_REGISTRATION_ID | This is the id for the device. By default it uses `my-first-device-id` |
    | CERTIFICATE_FILE             | File location of certificate file                                      |
    | KEY_FILE                     | File location of key file                                              |

#### Running the sample

From the `how_to_guides/device_provisioning` directory, run `node register_x509.js`

```
Registration succeeded...
 assigned hub=iot-hub-name.azure-devices.net
 deviceId=67bcb780-7348-4564-8202-b35c7700d0df
Client connected
Send status: MessageEnqueued
```

### Registering a device using an X509 group enrollment

When you have a certificate change containing a root certificate and several optional intermediate CA certificates, (possibly created using the [create_test_cert.js][provisioning-tools] script), you can proceed to create a group enrollment for your device. You have a few options:

1. You can use the [create_enrollment_gropup][service-sample-create-enrollment-group] sample in the [provisioning service SDK samples][service-samples] to enroll with the service. To use your x509 certificate, you need to update the enrollment object to contain your cert (either the root certificate or one of your intermediate CA certificates). If your cert comes from a CER file, it needs to be base64 encoded.

2. You can upload your group certificate to the Certificates tab in your Device Provisioning Service blade in the Azure portal and verify it. You can find instructions [here][lnk-x509-verification-instructions].

    At the very least, your root certificate needs to be uploaded to your Device Provisioning Service blade in the Azure portal, and it needs to be verified.

    Once the group is created and the certificates have been uploaded and verified, you can use [register_x509.js][register-x509] to register the device. When running this sample, you'll need to replace the '[provisioning host]' '[id scope]', '[registration id'], '[cert filename]', and '[key filename]' values in the code with your specific values. Guidance on populating these values can be found [here][simulate-x509-device]

    When registering a device via group enrollment, the cert may need to include the certificate chain that links it back to a verified certificate.

3. Finally, set the following environment variables. [Click here](../../../doc/devicesamples/setting-env-variables.md) if you need help setting environment variables.

    | Env variable                 | Description                                                            |
    | :--------------------------- | :--------------------------------------------------------------------- |
    | PROVISIONING_HOST            | Default is `global.azure-devices-provisioning.net`                     |
    | PROVISIONING_IDSCOPE         | `ID Scope` from the Device Provision Service                           |
    | PROVISIONING_REGISTRATION_ID | This is the id for the device. By default it uses `my-first-device-id` |
    | CERTIFICATE_FILE             | File location of certificate file                                      |
    | KEY_FILE                     | File location of key file                                              |

#### Running the sample

From the `how_to_guides/device_provisioning` directory, run `node register_x509.js`

```
Registration succeeded...
 assigned hub=iot-hub-name.azure-devices.net
 deviceId=67bcb780-7348-4564-8202-b35c7700d0df
Client connected
Send status: MessageEnqueued
```

# 📖 Further reading

- [IoT Hub Device Provisioning Service (DPS) terminology](https://docs.microsoft.com/en-us/azure/iot-dps/concepts-service)
- [Quickstart: Set up the IoT Hub Device Provisioning Service with the Azure portal](https://docs.microsoft.com/en-us/azure/iot-dps/quick-setup-auto-provision)
- [Symmetric key attestation](https://docs.microsoft.com/en-us/azure/iot-dps/concepts-symmetric-key-attestation?tabs=windows#detailed-attestation-process)
- [How to provision devices using symmetric key enrollment groups](https://docs.microsoft.com/en-us/azure/iot-dps/how-to-legacy-device-symm-key?tabs=windows)
- [Device Authentication using X.509 CA Certificates](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-x509ca-overview)
- [Tutorial: Using Microsoft-supplied scripts to create test certificates](https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-security-x509-get-started#registercerts)
- [TPM attestation](https://docs.microsoft.com/en-us/azure/iot-dps/concepts-tpm-attestation)
- [Quickstart: Enroll individual device to IoT Hub Device Provisioning Service using TPM](https://docs.microsoft.com/en-us/azure/iot-dps/quick-enroll-device-tpm?tabs=symmetrickey&pivots=programming-language-nodejs)

# 👉 Next Steps

- [Send messages to IoT Hub](../send_messages)
- [More getting started samples](../../)

# 💬 Feedback

If you have any feedback or questions about our device samples, please [post it here](https://github.com/Azure/azure-iot-sdk-node/discussions/1042).

[lnk-setup-iot-provisioning]: https://docs.microsoft.com/en-us/azure/iot-dps/quick-setup-auto-provision
[lnk-setup-iot-hub]: https://aka.ms/howtocreateazureiothub
[lnk-manage-iot-hub]: https://aka.ms/manageiothub
[node-api-reference]: https://docs.microsoft.com/en-us/javascript/api/azure-iot-device/
[node-devbox-setup]: ../../doc/node-devbox-setup.md
[register-x509]: https://github.com/azure/azure-iot-sdk-node/tree/main/provisioning/device/samples/register_x509.js
[service-samples]: https://github.com/azure/azure-iot-sdk-node/tree/main/provisioning/service/samples/readme.md
[service-sample-create-individual-enrollment]: https://github.com/azure/azure-iot-sdk-node/tree/main/provisioning/service/samples/create_individual_enrollment.js
[service-sample-create-enrollment-group]: https://github.com/azure/azure-iot-sdk-node/tree/main/provisioning/service/samples/create_enrollment_group.js
[package-json]: https://github.com/azure/azure-iot-sdk-node/tree/main/provisioning/device/samples/package.json
[pem-npm]: https://www.npmjs.com/package/pem
[provisioning-e2e]: https://github.com/azure/azure-iot-sdk-node/tree/main/provisioning/e2e
[c-sdk-create-individual-enrollment]: https://docs.microsoft.com/en-us/azure/iot-dps/quick-create-simulated-device-x509
[lnk-dps-concepts]: https://docs.microsoft.com/en-us/azure/iot-dps/concepts-service
[simulate-x509-device] https://docs.microsoft.com/en-us/azure/iot-dps/quick-create-simulated-device-x509-node#simulate-the-device
[provisioning-tools]: https://github.com/azure/azure-iot-sdk-node/tree/main/provisioning/tools
[lnk-x509-ca-overview]: https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-x509ca-overview
[lnk-x509-verification-instructions]: https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-security-x509-get-started#registercerts

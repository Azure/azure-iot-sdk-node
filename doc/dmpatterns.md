# The device management patterns samples

The device management pattern samples support the following device management tutorials, which provide both the device and service side code ready to execute. 

- [Get started with device management][get-started-dm-doc]
- [How to do a firmware update][fw-update-doc]

To learn more about Azure IoT Hub device management, see [Overview of Azure IoT Hub device management][overview-iot-dm-doc].

## Running the samples

From the root directory of the repository, run through the following steps to see the device and service interacting to enable the device management patterns:

### Reboot device management pattern:

1. Start the device side first, as it will register the C2D method listener for reboot:
    ```
    node device\samples\dmpatterns_reboot_device.js <IotHub device connection string>
    ```

2. In a new terminal window, start the service side to initate the reboot:

    ```
    node service\samples\dmpatterns_reboot_service.js <IotHub connection string>
    ```

### Firmware Update device management pattern:

1. Start the device side first, as it will register the C2D method listener for firmware update:

    ```
    node device\samples\dmpatterns_fwupdate_device.js <IotHub device connection string>
    ```

2. In a new terminal window, start the service side to initate the firmware update:

    ```
    node service\samples\dmpatterns_fwupdate_service.js <IotHub connection string>
    ```

[overview-iot-dm-doc]: https://azure.microsoft.com/en-us/documentation/articles/iot-hub-device-management-overview/
[get-started-dm-doc]: https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-node-node-device-management-get-started
[fw-update-doc]: https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-node-node-firmware-update

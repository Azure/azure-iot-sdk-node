# azure-iot-digitaltwins-device samples

The **javascript** and **typescript** folders contain two implementations of a simulated environmental sensor.
They show how to:

- Implement the environmental sensor interface
- Create an interfaceInstance for this interface
- Use the digital twin device client to register this interfaceInstance and interact with the Digital Twins services.

Please note that the `DigitalTwinClient` depends on the `Client` class from `azure-iot-device` to communicate with the hub. The sample shows how to compose these two together.

To get started with these samples, Please refer to the instructions in each of the folder.
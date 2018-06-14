import { ModuleClient, Message } from 'azure-iot-device';
import { Mqtt } from 'azure-iot-device-mqtt';

const module = ModuleClient.fromConnectionString(process.env.MODULE_CONNECTION_STRING, Mqtt);

module.sendEvent(new Message('foo'), (err) => {
  if (err) {
    console.error(err.toString());
  } else {
    console.log('message sent');
  }
});

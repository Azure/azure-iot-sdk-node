import { Message } from 'azure-iot-common';
import { Client } from 'azure-iot-device';
// import { Amqp as Protocol } from 'azure-iot-device-amqp';
// import { AmqpWs as Protocol } from 'azure-iot-device-amqp';
import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
// import { MqttWs as Protocol } from 'azure-iot-device-mqtt';
// import { Http as Protocol } from 'azure-iot-device-http';

const client = Client.fromConnectionString(process.argv[2], Protocol);

client.open(() => {
  // Set up error handler
  client.on('error', (err) => {
    console.error(err.toString());
  });

  // Set up disconnect handler
  client.on('disconnect', () => {
    console.error('Client was disconnected');
  });

  // Set up C2D message receiver
  client.on('message', (msg) => {
    console.log('----- Message Received ' + msg.messageId);
    console.log('--------- Properties:');
    for (let i = 0;  i < msg.properties.count();
    i++) {
      const prop = msg.properties.getItem(i);
      console.log(prop.key + ': ' + prop.value);
    }
    console.log('--------- Body:');
    console.log(msg.getData().toString());

    client.complete(msg, (err) => {
      if (err) console.error('Error completing message: ' + err.toString());
      else console.log('Message completed successfully');
    });
  });

  // Set up Device Method receiver
  client.onDeviceMethod('method1', (request, response) => {
    console.log('----- Received method call');
    console.log(request.requestId + '(' + request.methodName + ')');
    console.log(JSON.stringify(request.payload, undefined, 2));
    response.send(200, {
      responseKey: 'responseValue'
    }, (err) => {
      if (err) console.error('Error sending method response: ' + err.toString());
      else console.log('Method response sent successfully');
    });
  });

  // Get the Twin and set up desired properties listener
  client.getTwin((err, twin) => {
    if (err) {
      console.error('Error getting twin: ' + err.toString());
    } else {
      twin.on('properties.desired', (props) => {
        console.log('----- Desired properties update: ');
        console.log(JSON.stringify(props, undefined, 2));
        twin.properties.reported.update({ prop1: 'val1' }, (err) => {
          if (err) console.error('Error sending reported properties update: ' + err.toString());
          else console.log('Twin reported properties update sent successfully');
        });
      });
    }
  });

  // Send a sample telemetry event
  client.sendEvent(new Message('ready!!'), (err) => {
    console.log('Message sent');
  });
});

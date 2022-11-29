'use strict';

// Choose a protocol by uncommenting one of these transports.
const Protocol = require('azure-iot-device-mqtt').Mqtt;
// const Protocol = require('azure-iot-device-amqp').Amqp;
// const Protocol = require('azure-iot-device-http').Http;
// const Protocol = require('azure-iot-device-mqtt').MqttWs;
// const Protocol = require('azure-iot-device-amqp').AmqpWs;

const ModuleClient = require('azure-iot-device').ModuleClient;

ModuleClient.fromEnvironment(Protocol, (err, client) => {
    if (err) {
        console.error(err.toString());
        process.exit(-1);
    } else {
        client.invokeMethod('pierreca-edge-test', 'methodTarget', {
            methodName: 'doSomethingInteresting',
            payload: 'foo',
            responseTimeoutInSeconds: 5,
            connectTimeoutInSeconds: 2
        }, (err, resp) => {
            if (err) {
                console.error(err.toString());
                process.exit(-1);
            } else {
                console.log(JSON.stringify(resp, null, 2));
                process.exit(0);
            }
        });
    }
});

var util = require('util');
var Client = require('azure-iot-device').Client;
var Message = require('azure-iot-common').Message;

var sys = require('./sys');

var argv = require('yargs')
           .usage('$0 --protocol [protocol] --testName [test-name] --deviceConnectionString [connection-string]')
           .describe('deviceConnectionString', 'Device connection string')
           .describe('protocol', 'Protocol to use to connect the device to the hub')
           .describe('testName', 'Name of the test to run')
           .demandOption(['protocol', 'testName', 'deviceConnectionString'])
           .argv;

var Protocol = null;
var firewallFailFunc = null;

switch(argv.protocol) {
  case 'amqp':
    Protocol = require('azure-iot-device-amqp').Amqp;
    firewallFailFunc = sys[process.platform].blockAmqp;
    break;
  case 'mqtt':
    Protocol = require('azure-iot-device-mqtt').Mqtt;
    firewallFailFunc = sys[process.platform].blockMqtt;
    break;
  case 'amqp-ws':
    Protocol = require('azure-iot-device-amqp').AmqpWs;
    firewallFailFunc = sys[process.platform].blockHttps;
    break;
  case 'mqtt-ws':
    Protocol = require('azure-iot-device-mqtt').MqttWs;
    firewallFailFunc = sys[process.platform].blockHttps;
    break;
  case 'http':
    Protocol = require('azure-iot-device-http').Http;
    firewallFailFunc = sys[process.platform].blockHttps;
    break;
  default:
    console.error('Unknown protocol name: ' + argv.testName);
    process.exit(2);
}

var failFunc = null;
switch(argv.testName) {
  case 'bad_nic':
    failFunc = sys[process.platform].disableNic;
    break;
  case 'bad_network':
    failFunc = sys.docker.disconnectNetwork;
    break;
  case 'blocked_port':
    failFunc = firewallFailFunc;
    break;
  default:
    console.error('Unknown test name: ' + argv.testName);
    process.exit(2);
}

var client = Client.fromConnectionString(argv.deviceConnectionString, Protocol);

function log(message) {
  console.log((new Date()).toISOString() + ': ' + message);
}

client.open(function (err) {
  if (err) {
    log('OPEN ERROR: ' + err.toString());
    process.exit(1);
  } else {
    log('OPEN: OK');
    
    client.on('disconnect', function(err) {
      log('DISCONNECT: ' + err.toString());
      process.exit(0);
    });

    client.on('error', function(err) {
      log('ERROR: ' + err.toString());
      process.exit(1);
    });

    client.sendEvent(new Message((new Date()).toISOString()), function (err) {
      if (err) {
        log('SEND ERROR: ' + err.toString());
        process.exit(2);
      } else {
        log('SEND: OK');
        failFunc(function(err) {
          if (err) {
            log('SYS ERROR: ' + err.toString());
          } else {
            log('SYS: NIC DISABLED');
          }
        });
      }
    });
  }
});
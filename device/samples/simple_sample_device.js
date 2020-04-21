const MqttWs = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const ExponentialBackoffWithJitter = require('azure-iot-common').ExponentialBackOffWithJitter;
const moment = require('moment-timezone');

const connectString = process.env.DEVICE_CONNECTION_STRING;
let client = Client.fromConnectionString(connectString, MqttWs);
client.setRetryPolicy(new ExponentialBackoffWithJitter());

var messageCount = 0;

var tokenValidTimeInSeconds =  70;
var tokenRenewalMarginInSeconds = 51; //originally 360 seconds

var options = {
	tokenRenewal: {
		tokenValidTimeInSeconds: tokenValidTimeInSeconds,
		tokenRenewalMarginInSeconds: tokenRenewalMarginInSeconds
	},
	keepalive: 25
}

client.setOptions(options, function () {
	console.log('[App] setOptions: done.');
});

client.open(connectCallback);
var startTime = moment().utc().format();

async function connectCallback(err) {
	if (err) {
		console.log(err);
	} else {
		console.log('[App] Connected to IoT Hub.');
		client.on('disconnect', disconnectCallback);
		client.on('error', errorCallback);
		client.onDeviceMethod('test', (request, response) => {
			console.log('test');
			response.send(200, 'example payload', function(err) {
				if(!!err) {
					console.error('An error ocurred when sending a method response:\n' +
						err.toString());
				} else {
					console.log('Response to method \'' + request.methodName +
						'\' sent successfully.' );
				}
			});
		});
		await sleep(tokenRenewalMarginInSeconds * 1000 - (17 * 1000)); // originally subtracting 120 seconds, so sleeping for 240 seconds
		//await sleep(43 * 60 * 1000); //for default renewal period
		console.log('====================================================');
		console.log('[App] Disconnect Ethernet cable in 5 seconds.');
		console.log('[App] Time : ' + moment().utc().format());
		console.log('====================================================');

		await sleep(714);

		const body = {};
		body.category = 'test';
		body.messageName = 'message';
		body.id = messageCount;
		await d2c(body);

		await sleep(1 * 60 * 1000);

		console.log('====================================================');
		console.log('[App] Connect Ethernet cable in 30 seconds.');
		console.log('[App] Time : ' + moment().utc().format());
		console.log('====================================================');

		setInterval(sendMessage, 4000);
	}
}

async function sendMessage() {
	messageCount += 1;
	const body = {};
	body.category = 'test';
	body.messageName = 'message';
	body.id = messageCount;
	await d2c(body);
}

async function sleep(msec) {
	return new Promise(
		(resolve) => {
			setTimeout(resolve, msec);
		});
}

async function d2c(body) {
	const message = new Message(JSON.stringify(body));
	message.contentEncoding = 'utf-8';
	message.contentType = 'application/json';

	console.log('[App] Send Message : ' + body.id);
	console.log('[App] Time : '  + moment().utc().format());
	client.sendEvent(message, responseCallback(body.id));
}

function responseCallback(id) {
	return (err, res) => {
		console.log('[App] Recived Response : ' + id);
		if (err) {
			console.log(err);
		}
		if (res) {
			console.log(res);
		}
	}
}

async function disconnectCallback() {
	console.log('[App] Disconnected from IoT Hub');
	console.log('Time : ' + moment().utc().format());
	await client.close();
}

async function errorCallback(err) {
	console.log('[App] Connection error.');
	console.log('Time : ' + moment().utc().format());
	console.log(err);
	await client.close();
}

process.on('SIGINT', async () => {
	process.exit();
});

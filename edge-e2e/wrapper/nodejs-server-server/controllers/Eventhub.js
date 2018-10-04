'use strict';

var utils = require('../utils/writer.js');
var Eventhub = require('../service/EventhubService');

module.exports.eventhubConnectPUT = function eventhubConnectPUT (req, res, next) {
  var connectionString = req.swagger.params['connectionString'].value;
  Eventhub.eventhubConnectPUT(connectionString)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.eventhubConnectionIdDeviceTelemetryDeviceIdGET = function eventhubConnectionIdDeviceTelemetryDeviceIdGET (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  var deviceId = req.swagger.params['deviceId'].value;
  Eventhub.eventhubConnectionIdDeviceTelemetryDeviceIdGET(connectionId,deviceId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.eventhubConnectionIdDisconnectPUT = function eventhubConnectionIdDisconnectPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  Eventhub.eventhubConnectionIdDisconnectPUT(connectionId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.eventhubConnectionIdEnableTelemetryPUT = function eventhubConnectionIdEnableTelemetryPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  Eventhub.eventhubConnectionIdEnableTelemetryPUT(connectionId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

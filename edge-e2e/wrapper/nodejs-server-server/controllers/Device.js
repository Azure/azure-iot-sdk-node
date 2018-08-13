'use strict';

var utils = require('../utils/writer.js');
var Device = require('../service/DeviceService');

module.exports.deviceConnectTransportTypePUT = function deviceConnectTransportTypePUT (req, res, next) {
  var transportType = req.swagger.params['transportType'].value;
  var connectionString = req.swagger.params['connectionString'].value;
  var caCertificate = req.swagger.params['caCertificate'].value;
  Device.deviceConnectTransportTypePUT(transportType,connectionString,caCertificate)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.deviceConnectionIdDisconnectPUT = function deviceConnectionIdDisconnectPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  Device.deviceConnectionIdDisconnectPUT(connectionId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.deviceConnectionIdEnableMethodsPUT = function deviceConnectionIdEnableMethodsPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  Device.deviceConnectionIdEnableMethodsPUT(connectionId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.deviceConnectionIdRoundtripMethodCallMethodNamePUT = function deviceConnectionIdRoundtripMethodCallMethodNamePUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  var methodName = req.swagger.params['methodName'].value;
  var requestAndResponse = req.swagger.params['requestAndResponse'].value;
  Device.deviceConnectionIdRoundtripMethodCallMethodNamePUT(connectionId,methodName,requestAndResponse)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

'use strict';

var utils = require('../utils/writer.js');
var Service = require('../service/ServiceService');

module.exports.serviceConnectPUT = function serviceConnectPUT (req, res, next) {
  var connectionString = req.swagger.params['connectionString'].value;
  Service.serviceConnectPUT(connectionString)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.serviceConnectionIdDeviceMethodDeviceIdPUT = function serviceConnectionIdDeviceMethodDeviceIdPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  var deviceId = req.swagger.params['deviceId'].value;
  var methodInvokeParameters = req.swagger.params['methodInvokeParameters'].value;
  Service.serviceConnectionIdDeviceMethodDeviceIdPUT(connectionId,deviceId,methodInvokeParameters)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.serviceConnectionIdDisconnectPUT = function serviceConnectionIdDisconnectPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  Service.serviceConnectionIdDisconnectPUT(connectionId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.serviceConnectionIdModuleMethodDeviceIdModuleIdPUT = function serviceConnectionIdModuleMethodDeviceIdModuleIdPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  var deviceId = req.swagger.params['deviceId'].value;
  var moduleId = req.swagger.params['moduleId'].value;
  var methodInvokeParameters = req.swagger.params['methodInvokeParameters'].value;
  Service.serviceConnectionIdModuleMethodDeviceIdModuleIdPUT(connectionId,deviceId,moduleId,methodInvokeParameters)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

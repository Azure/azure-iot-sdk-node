'use strict';

var utils = require('../utils/writer.js');
var Registry = require('../service/RegistryService');

module.exports.registryConnectPUT = function registryConnectPUT (req, res, next) {
  var connectionString = req.swagger.params['connectionString'].value;
  Registry.registryConnectPUT(connectionString)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.registryConnectionIdDisconnectPUT = function registryConnectionIdDisconnectPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  Registry.registryConnectionIdDisconnectPUT(connectionId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.registryConnectionIdModuleTwinDeviceIdModuleIdGET = function registryConnectionIdModuleTwinDeviceIdModuleIdGET (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  var deviceId = req.swagger.params['deviceId'].value;
  var moduleId = req.swagger.params['moduleId'].value;
  Registry.registryConnectionIdModuleTwinDeviceIdModuleIdGET(connectionId,deviceId,moduleId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.registryConnectionIdModuleTwinDeviceIdModuleIdPATCH = function registryConnectionIdModuleTwinDeviceIdModuleIdPATCH (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  var deviceId = req.swagger.params['deviceId'].value;
  var moduleId = req.swagger.params['moduleId'].value;
  var props = req.swagger.params['props'].value;
  Registry.registryConnectionIdModuleTwinDeviceIdModuleIdPATCH(connectionId,deviceId,moduleId,props)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

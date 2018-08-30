'use strict';

var utils = require('../utils/writer.js');
var Module = require('../service/ModuleService');

module.exports.moduleConnectFromEnvironmentTransportTypePUT = function moduleConnectFromEnvironmentTransportTypePUT (req, res, next) {
  var transportType = req.swagger.params['transportType'].value;
  Module.moduleConnectFromEnvironmentTransportTypePUT(transportType)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.moduleConnectTransportTypePUT = function moduleConnectTransportTypePUT (req, res, next) {
  var transportType = req.swagger.params['transportType'].value;
  var connectionString = req.swagger.params['connectionString'].value;
  var caCertificate = req.swagger.params['caCertificate'].value;
  Module.moduleConnectTransportTypePUT(transportType,connectionString,caCertificate)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.moduleConnectionIdDeviceMethodDeviceIdPUT = function moduleConnectionIdDeviceMethodDeviceIdPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  var deviceId = req.swagger.params['deviceId'].value;
  var methodInvokeParameters = req.swagger.params['methodInvokeParameters'].value;
  Module.moduleConnectionIdDeviceMethodDeviceIdPUT(connectionId,deviceId,methodInvokeParameters)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.moduleConnectionIdDisconnectPUT = function moduleConnectionIdDisconnectPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  Module.moduleConnectionIdDisconnectPUT(connectionId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.moduleConnectionIdEnableInputMessagesPUT = function moduleConnectionIdEnableInputMessagesPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  Module.moduleConnectionIdEnableInputMessagesPUT(connectionId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.moduleConnectionIdEnableMethodsPUT = function moduleConnectionIdEnableMethodsPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  Module.moduleConnectionIdEnableMethodsPUT(connectionId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.moduleConnectionIdEnableTwinPUT = function moduleConnectionIdEnableTwinPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  Module.moduleConnectionIdEnableTwinPUT(connectionId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.moduleConnectionIdEventPUT = function moduleConnectionIdEventPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  var eventBody = req.swagger.params['eventBody'].value;
  Module.moduleConnectionIdEventPUT(connectionId,eventBody)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.moduleConnectionIdInputMessageInputNameGET = function moduleConnectionIdInputMessageInputNameGET (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  var inputName = req.swagger.params['inputName'].value;
  Module.moduleConnectionIdInputMessageInputNameGET(connectionId,inputName)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.moduleConnectionIdModuleMethodDeviceIdModuleIdPUT = function moduleConnectionIdModuleMethodDeviceIdModuleIdPUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  var deviceId = req.swagger.params['deviceId'].value;
  var moduleId = req.swagger.params['moduleId'].value;
  var methodInvokeParameters = req.swagger.params['methodInvokeParameters'].value;
  Module.moduleConnectionIdModuleMethodDeviceIdModuleIdPUT(connectionId,deviceId,moduleId,methodInvokeParameters)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.moduleConnectionIdOutputEventOutputNamePUT = function moduleConnectionIdOutputEventOutputNamePUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  var outputName = req.swagger.params['outputName'].value;
  var eventBody = req.swagger.params['eventBody'].value;
  Module.moduleConnectionIdOutputEventOutputNamePUT(connectionId,outputName,eventBody)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.moduleConnectionIdRoundtripMethodCallMethodNamePUT = function moduleConnectionIdRoundtripMethodCallMethodNamePUT (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  var methodName = req.swagger.params['methodName'].value;
  var requestAndResponse = req.swagger.params['requestAndResponse'].value;
  Module.moduleConnectionIdRoundtripMethodCallMethodNamePUT(connectionId,methodName,requestAndResponse)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.moduleConnectionIdTwinDesiredPropPatchGET = function moduleConnectionIdTwinDesiredPropPatchGET (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  Module.moduleConnectionIdTwinDesiredPropPatchGET(connectionId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.moduleConnectionIdTwinGET = function moduleConnectionIdTwinGET (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  Module.moduleConnectionIdTwinGET(connectionId)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.moduleConnectionIdTwinPATCH = function moduleConnectionIdTwinPATCH (req, res, next) {
  var connectionId = req.swagger.params['connectionId'].value;
  var props = req.swagger.params['props'].value;
  Module.moduleConnectionIdTwinPATCH(connectionId,props)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

'use strict';

var utils = require('../utils/writer.js');
var Wrapper = require('../service/WrapperService');

module.exports.wrapperCleanupPUT = function wrapperCleanupPUT (req, res, next) {
  Wrapper.wrapperCleanupPUT()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.wrapperMessagePUT = function wrapperMessagePUT (req, res, next) {
  var msg = req.swagger.params['msg'].value;
  Wrapper.wrapperMessagePUT(msg)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.wrapperSessionGET = function wrapperSessionGET (req, res, next) {
  Wrapper.wrapperSessionGET()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.wrapperSessionPUT = function wrapperSessionPUT (req, res, next) {
  Wrapper.wrapperSessionPUT()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

var iothub = require('azure-iothub');

var connectionString = "[IoT Hub Connection String]";
var deviceId = '[Device ID]';
var moduleId = '[Module ID]';

var registry = iothub.Registry.fromConnectionString(connectionString);

var getModulesOnDevice = function(done) {
  console.log();
  console.log('getting all modules from device ' + deviceId);

  registry.getModulesOnDevice(deviceId, function(err, modules) {
    if (err) {
      console.log('getModulesOnDevice failed ' + err);
      done();
    } else {
      console.log(modules.length.toString() + ' modules found');
      modules.forEach(function(module) {
        console.log(module.moduleId);
      });
      done();
    }
  });
};

var addNewModule = function(done) {
  console.log();
  console.log('adding new module with moduleId=' + moduleId);

  registry.addModule({deviceId: deviceId, moduleId: moduleId}, function(err) {
    if (err) {
      console.log('addModule failed ' + err);
      done();
    } else {
      console.log('addModule succeeded');
      done();
    }
  });
};

var updateModule = function(done) {
  console.log();
  console.log('updating module with moduleId=' + moduleId);

  registry.getModule(deviceId, moduleId, function(err, module) {
    if (err) {
      console.log('getModule failed ' + err);
      done();
    } else {
      console.log('getModule succeeded');
      var oldPrimary = module.authentication.symmetricKey.primaryKey;
      module.authentication.symmetricKey.primaryKey = module.authentication.symmetricKey.secondaryKey;
      module.authentication.symmetricKey.secondaryKey = oldPrimary;
      console.log('using updateModule to set primary key to ' + module.authentication.symmetricKey.primaryKey);
      registry.updateModule(module, function(err) {
        if (err) {
          console.log('updateModule failed ' + err);
          done();
        } else {
          console.log('updateModule succeeded');
          done();
        }
      });
    }
  });

};

var removeModule = function(done) {
  console.log();
  console.log('removing module with moduleId=' + moduleId);

  registry.removeModule(deviceId, moduleId, function(err) {
    if (err) {
      console.log('removeModule failed ' + err);
      done();
    } else {
      console.log('removeModule succeeded');
      done();
    }
  });
};

getModulesOnDevice(function() {
  addNewModule(function() {
    updateModule(function() {
      removeModule(function() {
      });
    });
  });
});


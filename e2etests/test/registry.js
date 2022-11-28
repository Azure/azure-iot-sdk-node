// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

let azureStorage = require('azure-storage');
let Registry = require('azure-iothub').Registry;
let errors = require('azure-iot-common').errors;
let assert = require('chai').assert;
let uuid = require('uuid');
let debug = require('debug')('e2etests:registry');

let hubConnectionString = process.env.IOTHUB_CONNECTION_STRING;
let storageConnectionString = process.env.STORAGE_CONNECTION_STRING;

let deviceIdOnly = {
  deviceId: uuid.v4()
};

let deviceIdWithKeys = {
  deviceId: uuid.v4(),
  authentication: {
    symmetricKey: {
      primaryKey: Buffer.from("1234567890qwerty").toString('base64'),
      secondaryKey: Buffer.from("ytrewq0987654321").toString('base64')
    }
  },
  status: "disabled"
};

let deviceIdWithThumbprints = {
  deviceId: uuid.v4(),
  authentication: {
    x509Thumbprint: {
      primaryThumbprint: '0000000000000000000000000000000000000000',
      secondaryThumbprint: '1111111111111111111111111111111111111111'
    }
  },
  status: "disabled"
};

describe('Registry', function () {
  // eslint-disable-next-line no-invalid-this
  this.timeout(60000);
  it('Creates a device with only a deviceId and gets it', function (done){
    let registry = Registry.fromConnectionString(hubConnectionString);

    registry.create(deviceIdOnly, function (createErr, createResult) {
      if (createErr) {
        done(createErr);
      } else {
        assert.equal(createResult.deviceId, deviceIdOnly.deviceId, 'created device doesn\'t have the requested deviceId');
        registry.get(deviceIdOnly.deviceId, function (getErr, getResult) {
          if (getErr) {
            done(getErr);
          } else {
            assert.equal(getResult.deviceId, deviceIdOnly.deviceId);
            done();
          }
        });
      }
    });
  });

  it('Creates a device with secret key parameters and gets it', function (done){
    let registry = Registry.fromConnectionString(hubConnectionString);

    registry.create(deviceIdWithKeys, function (createErr, createResult) {
      if (createErr) {
        done(createErr);
      } else {
        assert.equal(createResult.deviceId, deviceIdWithKeys.deviceId, 'created device doesn\'t have the requested deviceId');
        registry.get(deviceIdWithKeys.deviceId, function (getErr, getResult) {
          if (getErr) {
            done(getErr);
          } else {
            assert.equal(getResult.deviceId, deviceIdWithKeys.deviceId);
            assert.equal(getResult.authentication.symmetricKey.primaryKey, deviceIdWithKeys.authentication.symmetricKey.primaryKey);
            assert.equal(getResult.authentication.symmetricKey.secondaryKey, deviceIdWithKeys.authentication.symmetricKey.secondaryKey);
            assert.equal(getResult.disabled, deviceIdWithKeys.disabled);
            done();
          }
        });
      }
    });
  });

  it('Creates a device with thumbprint parameters and gets it', function (done){
    let registry = Registry.fromConnectionString(hubConnectionString);

    registry.create(deviceIdWithThumbprints, function (createErr, createResult) {
      if (createErr) {
        done(createErr);
      } else {
        assert.equal(createResult.deviceId, deviceIdWithThumbprints.deviceId, 'created device doesn\'t have the requested deviceId');
        registry.get(deviceIdWithThumbprints.deviceId, function (getErr, getResult) {
          if (getErr) {
            done(getErr);
          } else {
            assert.equal(getResult.deviceId, deviceIdWithThumbprints.deviceId);
            assert.equal(getResult.authentication.x509Thumbprint.primaryThumbprint, deviceIdWithThumbprints.authentication.x509Thumbprint.primaryThumbprint);
            assert.equal(getResult.authentication.x509Thumbprint.secondaryThumbprint, deviceIdWithThumbprints.authentication.x509Thumbprint.secondaryThumbprint);
            assert.equal(getResult.disabled, deviceIdWithThumbprints.disabled);
            done();
          }
        });
      }
    });
  });

  it('Fails to create a device with an invalid name', function (done) {
    let registry = Registry.fromConnectionString(hubConnectionString);

    registry.create({ deviceId: 'invalid/name' }, function (createErr) {
      assert.isNotNull(createErr);
      done();
    });
  });

  it('Lists devices and all test devices are there', function (done) {
    let registry = Registry.fromConnectionString(hubConnectionString);
    registry.list(function (err, deviceList) {
      if (err) {
        done(err);
      } else {
        let found = 0;

        deviceList.forEach(function (device) {
          if (device.deviceId === deviceIdOnly.deviceId) {
            found++;
          }
          if (device.deviceId === deviceIdWithKeys.deviceId) {
            found++;
          }
          if (device.deviceId === deviceIdWithThumbprints.deviceId) {
            found++;
          }
        });

        if (found === 3) {
          done();
        } else {
          done(new Error('One device not found'));
        }
      }
    });
  });

  it('Deletes a device and then fails to get it', function (done) {
    let registry = Registry.fromConnectionString(hubConnectionString);
    registry.delete(deviceIdOnly.deviceId, function (delErr){
      if(delErr) {
        done(delErr);
      } else {
        registry.get(deviceIdOnly.deviceId, function (getErr) {
          assert.equal(getErr.name, errors.DeviceNotFoundError.name);
          done();
        });
      }
    });
  });

  it('Lists devices and one one device remains', function (done) {
    let registry = Registry.fromConnectionString(hubConnectionString);
    registry.list(function (err, deviceList) {
      if (err) {
        done(err);
      } else {
        let foundOne = false;
        let foundTwo = false;

        deviceList.forEach(function (device) {
          if (device.deviceId === deviceIdOnly.deviceId) {
            foundOne = true;
          }
          if (device.deviceId === deviceIdWithKeys.deviceId) {
            foundTwo = true;
          }
        });

        if (foundOne) {
          done(new Error('Device is still there'));
        } else if (!foundTwo) {
          done(new Error('Device missing'));
        } else {
          done();
        }
      }
    });
  });

  it('Updates the device and gets it', function (done) {
    let registry = Registry.fromConnectionString(hubConnectionString);
    deviceIdWithKeys.authentication.symmetricKey.secondaryKey = Buffer.from('qwertyuiopasdfghjkl').toString('base64');
    registry.update(deviceIdWithKeys, function (updateErr, updatedDevice) {
      if (updateErr) {
        done(updateErr);
      } else {
        assert.equal(updatedDevice.authentication.symmetricKey.secondaryKey, deviceIdWithKeys.authentication.symmetricKey.secondaryKey);
        registry.get(deviceIdWithKeys.deviceId, function (getErr, getResult) {
          if (getErr) {
            done(getErr);
          } else {
            assert.equal(getResult.authentication.symmetricKey.secondaryKey, deviceIdWithKeys.authentication.symmetricKey.secondaryKey);
            done();
          }
        });
      }
    });
  });

  it('Fails to delete a device if it doesn\'t exist', function (done) {
    let registry = Registry.fromConnectionString(hubConnectionString);
    registry.delete('doesntexist' + uuid.v4(), function (delErr){
      assert.equal(delErr.name, errors.DeviceNotFoundError.name);
      done();
    });
  });

  [deviceIdWithKeys.deviceId, deviceIdWithThumbprints.deviceId].forEach(function (deviceId) {
    it('Deletes device created for the test with id ' + deviceId, function (done) {
      let registry = Registry.fromConnectionString(hubConnectionString);
      registry.delete(deviceId, function (delErr){
        if(delErr) {
          done(delErr);
        } else {
          registry.get(deviceId, function (getErr) {
            assert.equal(getErr.name, errors.DeviceNotFoundError.name);
            done();
          });
        }
      });
    });
  });

  it('Can create an edge and device scope relationship', function (done){
    let registry = Registry.fromConnectionString(hubConnectionString);

    let edgeDevice = {
      deviceId: 'delete-me-' + uuid.v4(),
      authentication: {
        symmetricKey: {
          primaryKey: Buffer.from("1234567890qwerty").toString('base64'),
          secondaryKey: Buffer.from("ytrewq0987654321").toString('base64')
        }
      },
      status: "enabled",
      capabilities: {
        iotEdge: true
      }
    };

    let scopedDevice = {
      deviceId: 'delete-me-' + uuid.v4(),
      authentication: {
        symmetricKey: {
          primaryKey: Buffer.from("1234567890qwerty").toString('base64'),
          secondaryKey: Buffer.from("ytrewq0987654321").toString('base64')
        }
      },
      status: "enabled"
    };

    registry.create(edgeDevice, function (edgeCreateErr, edgeCreateResult) {
      if (edgeCreateErr) {
        done(edgeCreateErr);
      } else {
        debug('Created edge device: ', edgeCreateResult.deviceId);
        assert(edgeCreateResult.capabilities.iotEdge, 'Created edge device does not contain correct capabilities.');
        assert(edgeCreateResult.deviceScope, 'Created edge device does not contain a scope value.');
        scopedDevice.deviceScope = edgeCreateResult.deviceScope;
        registry.create(scopedDevice, function (scopedDeviceCreateError, scopedDeviceCreateResult) {
          if (scopedDeviceCreateError) {
            registry.delete(edgeCreateResult.deviceId, function () {
              done(scopedDeviceCreateError);
            });
          } else {
            debug('Created scoped device: ', scopedDeviceCreateResult.deviceId);
            assert.equal(scopedDeviceCreateResult.deviceScope, scopedDevice.deviceScope, 'Created scoped device does not contain correct scope.');
            scopedDeviceCreateResult.deviceScope = uuid.v4();
            registry.update(scopedDeviceCreateResult, function (updateErr) {
              assert(updateErr, 'Scoped device was incorrectly allowed to update its scope property.');
              registry.delete(edgeCreateResult.deviceId, function (edgeDeleteError) {
                registry.delete(scopedDeviceCreateResult.deviceId, function (scopedDeleteError) {
                  done(edgeDeleteError || scopedDeleteError);
                });
              });
            });
          }
        });
      }
    });
  });

  it('Can create nested Edge devices', function (done) {
    let registry = Registry.fromConnectionString(hubConnectionString);

    let rootEdgeDevice = {
      deviceId: 'delete-me-' + uuid.v4(),
      authentication: {
        symmetricKey: {
          primaryKey: Buffer.from("1234567890qwerty").toString('base64'),
          secondaryKey: Buffer.from("ytrewq0987654321").toString('base64')
        }
      },
      status: "enabled",
      capabilities: {
        iotEdge: true
      }
    };

    let childEdgeDevice = {
      deviceId: 'delete-me-' + uuid.v4(),
      authentication: {
        symmetricKey: {
          primaryKey: Buffer.from("1234567890qwerty").toString('base64'),
          secondaryKey: Buffer.from("ytrewq0987654321").toString('base64')
        }
      },
      status: "enabled",
      capabilities: {
        iotEdge: true
      }
    };

    let leafDevice = {
      deviceId: 'delete-me-' + uuid.v4(),
      authentication: {
        symmetricKey: {
          primaryKey: Buffer.from("1234567890qwerty").toString('base64'),
          secondaryKey: Buffer.from("ytrewq0987654321").toString('base64')
        }
      },
      status: "enabled"
    };

    registry.create(rootEdgeDevice, function (rootEdgeDeviceCreateError, rootEdgeDeviceCreateResult) {
      if (rootEdgeDeviceCreateError) {
        done(rootEdgeDeviceCreateError);
      } else {
        debug('Created root edge device: ', rootEdgeDeviceCreateResult.deviceId);
        assert(rootEdgeDeviceCreateResult.capabilities.iotEdge, 'Created root edge device does not contain correct capabilities.');
        assert(rootEdgeDeviceCreateResult.deviceScope, 'Created root edge device does not contain a scope value.');
        childEdgeDevice.parentScopes = [rootEdgeDeviceCreateResult.deviceScope];
        registry.create(childEdgeDevice, function (childEdgeDeviceCreateError, childEdgeDeviceCreateResult) {
          if (childEdgeDeviceCreateError) {
            registry.delete(rootEdgeDeviceCreateResult.deviceId, function () {
              done(childEdgeDeviceCreateError);
            });
          } else {
            debug('Created child edge device: ', childEdgeDeviceCreateResult.deviceId);
            assert(childEdgeDeviceCreateResult.capabilities.iotEdge, 'Created child edge device does not contain correct capabilities.');
            assert(childEdgeDeviceCreateResult.deviceScope, 'Created child edge device does not contain a scope value.');
            assert.equal(childEdgeDeviceCreateResult.parentScopes[0], childEdgeDevice.parentScopes[0], 'Created child edge device does not contain correct parentScopes.');
            leafDevice.deviceScope = childEdgeDeviceCreateResult.deviceScope;
            leafDevice.parentScopes = [childEdgeDeviceCreateResult.deviceScope];
            registry.create(leafDevice, function (leafDeviceCreateError, leafDeviceCreateResult) {
              if (leafDeviceCreateError) {
                registry.delete(childEdgeDeviceCreateResult.deviceId, function () {
                  registry.delete(rootEdgeDeviceCreateResult.deviceId, function () {
                    done(childEdgeDeviceCreateError);
                  });
                });
              } else {
                debug('Created leaf device: ', leafDeviceCreateResult.deviceId);
                assert.equal(leafDeviceCreateResult.parentScopes[0], leafDevice.parentScopes[0], 'Created leaf device does not contain correct parentScopes.');
                assert.equal(leafDeviceCreateResult.deviceScope, leafDevice.deviceScope, 'Created leaf device does not contain correct scope.');
                registry.delete(leafDeviceCreateResult.deviceId, function (leafDeviceDeleteError) {
                  registry.delete(childEdgeDeviceCreateResult.deviceId, function (childEdgeDeviceDeleteError) {
                    registry.delete(rootEdgeDeviceCreateResult.deviceId, function (rootEdgeDeleteError) {
                      done(leafDeviceDeleteError || childEdgeDeviceDeleteError || rootEdgeDeleteError);
                    });
                  });
                });
              }
            });
          }
        });
      }
    });
  });

  // eslint-disable-next-line mocha/no-skipped-tests
  it.skip('Imports then exports devices', function (done) {
    // eslint-disable-next-line no-invalid-this
    this.timeout(120000);

    let testDeviceCount = 10;
    let registry = Registry.fromConnectionString(hubConnectionString);
    let blobSvc = azureStorage.createBlobService(storageConnectionString);

    let inputContainerName = 'nodee2e-import-' + uuid.v4();
    let outputContainerName = 'nodee2e-export-' + uuid.v4();
    let deviceFile = 'devices.txt';

    let inputBlobSasUrl;
    let outputBlobSasUrl;
    let devicesToImport = [];

    for (let i = 0; i < testDeviceCount; i++) {
      let deviceId = 'nodee2e-' + uuid.v4();
      let device = {
        id: deviceId,
        authentication: {
          symmetricKey: {
            primaryKey: Buffer.from(uuid.v4()).toString('base64'),
            secondaryKey: Buffer.from(uuid.v4()).toString('base64')
          }
        },
        status: 'enabled'
      };

      devicesToImport.push(device);
    }


    let devicesText = '';
    devicesToImport.forEach(function (device) {
      device.importMode = 'createOrUpdate';
      devicesText += JSON.stringify(device) + '\r\n';
    });

    debug('Devices to import: ' + devicesText);

    let createContainers = function () {
      return new Promise(function (resolve, reject) {
        debug('Create input container');
        blobSvc.createContainerIfNotExists(inputContainerName, function (err) {
          if(err) {
            reject(new Error('Could not create input container: ' + err.message));
          } else {
            let startDate = new Date();
            let expiryDate = new Date(startDate);
            expiryDate.setMinutes(startDate.getMinutes() + 100);
            startDate.setMinutes(startDate.getMinutes() - 100);

            let inputSharedAccessPolicy = {
              AccessPolicy: {
                Permissions: 'rl',
                Start: startDate,
                Expiry: expiryDate
              },
            };

            let outputSharedAccessPolicy = {
              AccessPolicy: {
                Permissions: 'rwd',
                Start: startDate,
                Expiry: expiryDate
              },
            };

            let inputSasToken = blobSvc.generateSharedAccessSignature(inputContainerName, null, inputSharedAccessPolicy);
            inputBlobSasUrl = blobSvc.getUrl(inputContainerName, null, inputSasToken);
            debug('Create output container');
            blobSvc.createContainerIfNotExists(outputContainerName, function (err) {
              if (err) {
                  reject(new Error('Could not create output container: ' + err.message));
              } else {
                  let outputSasToken = blobSvc.generateSharedAccessSignature(outputContainerName, null, outputSharedAccessPolicy);
                  outputBlobSasUrl = blobSvc.getUrl(outputContainerName, null, outputSasToken);
                  resolve();
              }
            });
          }
        });
      });
    };

    let deleteContainers = function () {
      return new Promise(function (resolve, reject) {
        let blobSvc = azureStorage.createBlobService(storageConnectionString);
        debug('Delete input container');
        blobSvc.deleteContainer(inputContainerName, function (err) {
          if(err) {
            reject(new Error('Could not delete input container: ' + err.message));
          } else {
            debug('Delete output container');
            blobSvc.deleteContainer(outputContainerName, function (err) {
              if(err) {
                reject(new Error('Could not delete output container: ' + err.message));
              } else {
                resolve();
              }
            });
          }
        });
      });
    };

    let verifyDeviceProperties = function (importedDevice, exportedDevice) {
      return importedDevice.id === exportedDevice.id &&
              importedDevice.authentication.symmetricKey.primaryKey === exportedDevice.authentication.symmetricKey.primaryKey &&
              importedDevice.authentication.symmetricKey.secondaryKey === exportedDevice.authentication.symmetricKey.secondaryKey &&
              importedDevice.status === exportedDevice.status;
    };

    let verifyOutputBlob = function () {
      return new Promise(function (resolve, reject){
        debug('Verifying export blob');
        blobSvc.getBlobToText(outputContainerName, deviceFile, function (err, result) {
          if(err) {
            reject(new Error('Could not get export blob: ' + err.message));
          } else {
            let devicesTextTable = result.split('\r\n');
            let exportedDevices = [];
            for (let i = 0; i < devicesTextTable.length; i++) {
              debug('[' + i + '] ' + devicesTextTable[i]);
              if (devicesTextTable[i].trim()) {
                  exportedDevices.push(JSON.parse(devicesTextTable[i]));
              }
            }

            for (let i = 0; i < devicesToImport.length; i++) {
              let deviceFound = false;
              for (let j = 0; j < exportedDevices.length; j++) {
                if (verifyDeviceProperties(devicesToImport[i], exportedDevices[j])) {
                  deviceFound = true;
                  debug('Found device: ' + devicesToImport[i].id);
                  break;
                }
              }

              if (!deviceFound) {
                reject(new Error('Could not find ' + devicesToImport[i].id));
              }
            }
            debug('Found all devices, cleaning device registry...');
            resolve();
          }
        });
      });
    };

    let runExportJob = function () {
      return new Promise(function (resolve, reject){
        debug('Starting export job');
        registry.exportDevicesToBlob(outputBlobSasUrl, false, function (err, result) {
          if(err) {
            reject(new Error('Could not create export job: ' + err.message));
          } else {
            debug('Export job created');
            let exportJobId = result.jobId;
            let jobFinished = false;
            const exportInterval = setInterval(function () {
              registry.getJob(exportJobId, function (err, result) {
                if (err) {
                  reject(new Error('Could not get export job status: ' + err.message));
                } else {
                  let status = result.status;
                  if (status === "completed" && !jobFinished) {
                    jobFinished = true;
                    debug('Export job completed');
                    clearInterval(exportInterval);
                    resolve();
                  }
                }
              });
            }, 1000);
          }
        });
      });
    };

    let runImportJob = function (devicesText) {
      return new Promise(function (resolve, reject){
        blobSvc.createBlockBlobFromText(inputContainerName, deviceFile, devicesText, function (err) {
          if(err) {
            reject(new Error('Could not create blob for import job: ' + err.message));
          } else {
            debug('Starting import job');
            registry.importDevicesFromBlob(inputBlobSasUrl, outputBlobSasUrl, function (err, result) {
              if(err) {
                reject(new Error('Could not create import job: ' + err.message));
              } else {
                let importJobId = result.jobId;
                let jobFinished = false;
                const importInterval = setInterval(function () {
                  registry.getJob(importJobId, function (err, result) {
                    if (err) {
                      reject(new Error('Could not get import job status: ' + err.message));
                    } else {
                      let status = result.status;
                      if (status === "completed" && !jobFinished) {
                        jobFinished = true;
                        debug('Import job completed');
                        clearInterval(importInterval);
                        resolve();
                      }
                    }
                  });
                }, 1000);
              }
            });
          }
        });
      });
    };

    let deleteTestDevices = function () {
      return new Promise(function (resolve, reject){
        debug('Cleaning devices');
        let devicesText = '';
        devicesToImport.forEach(function (device) {
          device.importMode = 'delete';
          devicesText += JSON.stringify(device) + '\r\n';
        });

        runImportJob(devicesText)
        .then(resolve)
        .catch(reject);
      });
    };

    createContainers()
    .then(function () { return runImportJob(devicesText); })
    .then(runExportJob)
    .then(verifyOutputBlob)
    .then(deleteTestDevices)
    .then(deleteContainers)
    .then(function () { done(); })
    .catch(function (err) { done(err); });
  });

  it('bulk Identity add/update/remove', function (done) {
    let registry = Registry.fromConnectionString(hubConnectionString);

    // Specify the new devices.
    let deviceAddArray = [
      {
        deviceId: '0000e2e-node-registry-identity-j-delete-me' + uuid.v4(),
        status: 'disabled',
        authentication: {
          symmetricKey: {
            primaryKey: Buffer.from(uuid.v4()).toString('base64'),
            secondaryKey: Buffer.from(uuid.v4()).toString('base64')
          }
        }
      },
      {
        deviceId: '0000e2e-node-registry-identity-j-delete-me' + uuid.v4(),
        status: 'disabled',
        authentication: {
          symmetricKey: {
            primaryKey: Buffer.from(uuid.v4()).toString('base64'),
            secondaryKey: Buffer.from(uuid.v4()).toString('base64')
          }
        }
      },
      {
        deviceId: '0000e2e-node-registry-identity-j-delete-me' + uuid.v4(),
        status: 'disabled',
        authentication: {
          symmetricKey: {
            primaryKey: Buffer.from(uuid.v4()).toString('base64'),
            secondaryKey: Buffer.from(uuid.v4()).toString('base64')
          }
        }
      }
    ];

    let deviceUpdateArray = [
      {
        deviceId: deviceAddArray[0].deviceId,
        status: 'enabled'
      },
      {
        deviceId: deviceAddArray[1].deviceId,
        status: 'enabled'
      },
      {
        deviceId: deviceAddArray[2].deviceId,
        status: 'enabled'
      }
    ];

    let deviceRemoveArray = [
      {
        deviceId: deviceAddArray[0].deviceId
      },
      {
        deviceId: deviceAddArray[1].deviceId
      },
      {
        deviceId: deviceAddArray[2].deviceId
      }
    ];

    registry.addDevices(deviceAddArray, andContinue( 'adding', function next() {
      registry.get(deviceUpdateArray[0].deviceId, checkStatusAndContinue( 'disabled', function next() {
        registry.get(deviceUpdateArray[1].deviceId, checkStatusAndContinue( 'disabled', function next() {
          registry.get(deviceUpdateArray[2].deviceId, checkStatusAndContinue( 'disabled', function next() {
            registry.updateDevices(deviceUpdateArray, true, andContinue('updating', function next() {
              registry.get(deviceUpdateArray[0].deviceId, checkStatusAndContinue( 'enabled', function next() {
                registry.get(deviceUpdateArray[1].deviceId, checkStatusAndContinue( 'enabled', function next() {
                  registry.get(deviceUpdateArray[2].deviceId, checkStatusAndContinue( 'enabled', function next() {
                    registry.removeDevices(deviceRemoveArray, true, andContinue('removing', function next() {
                      registry.get(deviceRemoveArray[0].deviceId, checkRemoveAndContinue( function next() {
                        registry.get(deviceRemoveArray[1].deviceId, checkRemoveAndContinue( function next() {
                          registry.get(deviceRemoveArray[2].deviceId, checkRemoveAndContinue( function next() {
                            done();
                          }));
                        }));
                      }));
                    }));
                  }));
                }));
              }));
            }));
          }));
        }));
      }));
    }));

    function andContinue(op, next) {
      return function processResult(err, resultData) {
        assert.isNull(err);
        assert.isNotNull(resultData);
        assert.isTrue(resultData.isSuccessful);
        assert.equal(resultData.errors.length,0);
        if (next) next();
      };
    }

    function checkStatusAndContinue(enabled, next) {
      return function processStatus(err, deviceInfo) {
        assert.isNull(err);
        assert.isNotNull(deviceInfo);
        assert.equal(deviceInfo.status, enabled);
        if (next) next();
      };
    }

    function checkRemoveAndContinue(next) {
      return function processRemove(err) {
        assert.equal(err.name, errors.DeviceNotFoundError.name);
        if (next) next();
      };
    }
  });
});

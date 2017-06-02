// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import {
    Device,
    Registry
} from 'azure-iothub';

/**
 * Get list of Devices in IoT Registry - returns Promise
 */
const listDevices = async (registry: Registry): Promise<Device[]> => {
    return new Promise<Device[]>((resolve, reject) => {
        registry.list((error: Error, deviceList: Device[]) => {
            if (error) {
                reject(error);
            } else {
                resolve(deviceList);
            }
        });
    });
};
/**
 * Create new Device - returns Promise
 */
const createDevice = async(registry: Registry, newDevice: Registry.DeviceDescription): Promise<Device> => {
    return new Promise<Device>((resolve, reject) => {
        registry.create(newDevice, (error: Error, device?: Device, response?: any) => {
            if (error) {
                reject(error);
            } else {
                console.log(`create status: ${response.statusCode} ${response.statusMessage}`);
                console.log(`create device info: ${JSON.stringify(device)}`);
                resolve(device);
            }
        });
    });
};
/**
 * Get Device from Registry - returns Promise
 */
const getDevice = async (registry: Registry, deviceId: string): Promise<Device> => {
    return new Promise<Device>((resolve, reject) => {
        registry.get(deviceId, (error: Error, device?: Device, response?: any) => {
            if (error) {
                reject(error);
            } else {
                console.log(`get status: ${response.statusCode} ${response.statusMessage}`);
                console.log(`get device info: ${JSON.stringify(device)}`);
                resolve(device);
            }
        });
    });
};
//
const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const registry = Registry.fromConnectionString(connectionString);
(async() => {
    // listing devices
    console.log('**listing devices ...');
    try {
        const deviceList: Device[] = await listDevices(registry);
        deviceList.forEach((device: Device) => {
            let key = (device.authentication) ?
                device.authentication.symmetricKey.primaryKey :
                '<no primary key>';
            console.log(`${device.deviceId}:${key}`);
        });
    } catch (error) {
        console.log(error);
    }
    // Create a new device
    let device = new Device();
    device.deviceId = `sample-device-${Date.now()}`;
    console.log(`**creating device ${device.deviceId}`);
    try {
        device = await createDevice(registry, device);
        device = await getDevice(registry, device.deviceId);
    } catch (error) {
        console.log(error);
    }
})();

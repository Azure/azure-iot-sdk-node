#!/bin/sh

# Copyright (c) Microsoft. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for full license information.

node_root=$(cd "$(dirname "$0")/.." && pwd)

cd $node_root/build/tools
echo "-- Removing links for `pwd` --"
yarn unlink azure-iothub

cd $node_root/e2etests
echo "\n-- Removing links for `pwd` --"
yarn unlink azure-iothub
yarn unlink azure-iot-device-mqtt
yarn unlink azure-iot-device-http
yarn unlink azure-iot-device-amqp
yarn unlink azure-iot-device
yarn unlink azure-iot-common

cd $node_root/device/transport/mqtt
echo "-- Removing links for `pwd` --"
yarn unlink
yarn unlink azure-iothub
yarn unlink azure-iot-device
yarn unlink azure-iot-common

cd $node_root/device/transport/http
echo "-- Removing links for `pwd` --"
yarn unlink
yarn unlink azure-iothub
yarn unlink azure-iot-device
yarn unlink azure-iot-common
yarn unlink azure-iot-http-base

cd $node_root/device/transport/amqp
echo "-- Removing links for `pwd` --"
yarn unlink
yarn unlink azure-iothub
yarn unlink azure-iot-device
yarn unlink azure-iot-common
yarn unlink azure-iot-amqp-base

cd $node_root/service
echo "-- Removing links for `pwd` --"
yarn unlink
yarn unlink azure-iot-http-base
yarn unlink azure-iot-amqp-base
yarn unlink azure-iot-common

cd $node_root/device/core
echo "-- Removing links for `pwd` --"
yarn unlink
yarn unlink azure-iot-common
yarn unlink azure-iot-http-base

cd $node_root/common/transport/http
echo "-- Removing links for `pwd` --"
yarn unlink
yarn unlink azure-iot-common

cd $node_root/common/transport/amqp
echo "-- Removing links for `pwd` --"
yarn unlink
yarn unlink azure-iot-common

cd $node_root/common/core
echo "-- Removing links for `pwd` --"
yarn unlink

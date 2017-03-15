#!/bin/sh

# Copyright (c) Microsoft. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for full license information.

node_root=$(cd "$(dirname "$0")/.." && pwd)

cd $node_root/common/core
echo "\n-- Creating links for `pwd` --"
yarn link
yarn install
[ $? -eq 0 ] || exit $?

cd $node_root/common/transport/amqp
echo "\n-- Creating links for `pwd` --"
yarn link azure-iot-common
yarn link
yarn install
[ $? -eq 0 ] || exit $?

cd $node_root/common/transport/http
echo "\n-- Creating links for `pwd` --"
yarn link azure-iot-common
yarn link
yarn install
[ $? -eq 0 ] || exit $?

cd $node_root/device/core
echo "\n-- Creating links for `pwd` --"
yarn link azure-iot-http-base
yarn link azure-iot-common
yarn link
yarn install
[ $? -eq 0 ] || exit $?

cd $node_root/service
echo "\n-- Creating links for `pwd` --"
yarn link azure-iot-common
yarn link azure-iot-amqp-base
yarn link azure-iot-http-base
yarn link
yarn install
[ $? -eq 0 ] || exit $?

cd $node_root/device/transport/amqp
echo "\n-- Creating links for `pwd` --"
yarn link azure-iot-amqp-base
yarn link azure-iot-common
yarn link azure-iot-device
yarn link azure-iothub
yarn link
yarn install
[ $? -eq 0 ] || exit $?

cd $node_root/device/transport/http
echo "\n-- Creating links for `pwd` --"
yarn link azure-iot-http-base
yarn link azure-iot-common
yarn link azure-iot-device
yarn link azure-iothub
yarn link
yarn install
[ $? -eq 0 ] || exit $?

cd $node_root/device/transport/mqtt
echo "\n-- Creating links for `pwd` --"
yarn link azure-iot-common
yarn link azure-iot-device
yarn link azure-iothub
yarn link
yarn install
[ $? -eq 0 ] || exit $?

cd $node_root/e2etests
echo "\n-- Creating links for `pwd` --"
yarn link azure-iot-common
yarn link azure-iot-device
yarn link azure-iot-device-amqp
yarn link azure-iot-device-http
yarn link azure-iot-device-mqtt
yarn link azure-iothub
yarn install

cd $node_root/build/tools
echo "\n-- Creating links for `pwd` --"
yarn link azure-iothub
yarn install
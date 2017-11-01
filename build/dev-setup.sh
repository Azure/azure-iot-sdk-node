#!/bin/sh

# Copyright (c) Microsoft. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for full license information.

node_root=$(cd "$(dirname "$0")/.." && pwd)

cd $node_root/build/tools
echo "\n-- Setting up links for build tools --"
npm install

echo "\n-- setting up node_modules --"
node build_parallel.js setup

echo "\n-- linking build tools to azure-iothub --"
npm link azure-iothub


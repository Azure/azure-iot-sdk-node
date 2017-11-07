#!/bin/sh

# Copyright (c) Microsoft. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for full license information.

node_root=$(cd "$(dirname "$0")/.." && pwd)

echo "\n-- Setting up build_parallel tool --"
cd $node_root/build/build_parallel
npm install

echo "\n-- setting up node_modules --"
node build_parallel.js setup

echo "\n-- Setting up links for build tools --"
cd $node_root/build/tools
npm link azure-iothub
npm install


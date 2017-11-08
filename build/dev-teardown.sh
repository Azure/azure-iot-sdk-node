#!/bin/sh

# Copyright (c) Microsoft. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for full license information.

node_root=$(cd "$(dirname "$0")/.." && pwd)

echo "\n-- Removing links for build tools --"
cd $node_root/build/tools
npm rm azure-iothub

echo "\n-- tearing down node_modules --"
cd $node_root/build/build_parallel
node build_parallel.js teardown

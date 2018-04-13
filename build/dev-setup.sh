#!/bin/sh

# Copyright (c) Microsoft. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for full license information.

node_root=$(cd "$(dirname "$0")/.." && pwd)

export NPM_CONFIG_PREFIX=$node_root/npm-symlinks
if [ ! -d $NPM_CONFIG_PREFIX ]; then
  mkdir $NPM_CONFIG_PREFIX
fi

cleanup_and_exit()
{
    exit $1
}

echo "\n-- Setting up build_parallel tool --"
cd $node_root/build/build_parallel
npm install
[ $? -eq 0 ] || cleanup_and_exit $?

echo "\n-- setting up node_modules --"
node build_parallel.js setup
[ $? -eq 0 ] || cleanup_and_exit $?

echo "\n-- Setting up links for build tools --"
cd $node_root/build/tools
npm link azure-iothub
[ $? -eq 0 ] || cleanup_and_exit $?
npm install
[ $? -eq 0 ] || cleanup_and_exit $?



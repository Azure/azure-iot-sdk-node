#!/bin/sh

# Copyright (c) Microsoft. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for full license information.

node_root=$(cd "$(dirname "$0")/.." && pwd)

if [ -z "$1" ]; then
  echo "Not removing any files because symlinks are in $node_root\npm-symlinks and teardown isn't necessary."
  echo "If you want to tear down anyway, run dev-teardown.cmd with the --force flag"
  exit 0
fi

if [ "$1" != "--force" ]; then
  echo "usage: dev-teardown.cmd [--force]"
  exit 1
fi

export NPM_CONFIG_PREFIX=$node_root/npm-symlinks

echo "\n-- Removing links for build tools --"
cd $node_root/build/tools
npm rm azure-iothub

echo "\n-- tearing down node_modules --"
cd $node_root/build/build_parallel
node build_parallel.js teardown

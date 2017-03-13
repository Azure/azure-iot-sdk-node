#!/bin/bash
# Copyright (c) Microsoft. All rights reserved.
# Licensed under the MIT license. See LICENSE file in the project root for full license information.

build_root=$(cd "$(dirname "$0")/.." && pwd)
cd $build_root

# Disable the npm progress bar (supposedly faster)
npm set progress=false

# Set up links in the npm cache to ensure we're exercising all the code in
# the repo, rather than downloading released versions of our packages from
# npm.
build/dev-setup.sh
[ $? -eq 0 ] || exit $?

# Lint all JavaScript code and run unit + integration tests
build/build.sh --min --integration-tests --e2e-tests
[ $? -eq 0 ] || exit $?

# No need to run dev-teardown.sh anymore since we're running of containers
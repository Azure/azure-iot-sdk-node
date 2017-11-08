@REM Copyright (c) Microsoft. All rights reserved.
@REM Licensed under the MIT license. See LICENSE file in the project root for full license information.

@setlocal
@echo off

set node-root=%~dp0..
REM // resolve to fully qualified path
for %%i in ("%node-root%") do set node-root=%%~fi

echo -- Removing links for build tools --
cd %node-root%\build\tools
echo .
call npm rm azure-iothub

echo -- tearing down node_modules --
pushd "%node-root%\build\build_parallel"
call node build_parallel.js teardown
popd

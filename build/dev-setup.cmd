@REM Copyright (c) Microsoft. All rights reserved.
@REM Licensed under the MIT license. See LICENSE file in the project root for full license information.

@setlocal
@echo off

set node-root=%~dp0..
REM // resolve to fully qualified path
for %%i in ("%node-root%") do set node-root=%%~fi

echo.
echo -- Setting up build_parallel tool --
cd %node-root%\build\build_parallel
call npm install

echo.
echo -- setting up node_modules --
call node build_parallel.js setup

echo .
echo -- Setting up links for build tools --
cd %node-root%\build\tools
call npm link azure-iothub
call npm install


@REM Copyright (c) Microsoft. All rights reserved.
@REM Licensed under the MIT license. See LICENSE file in the project root for full license information.

@setlocal
@echo off

set node-root=%~dp0..
REM // resolve to fully qualified path
for %%i in ("%node-root%") do set node-root=%%~fi

if "%1" == "" ( 
  echo Not removing any files because symlinks are in %node-root%\npm-symlinks and teardown isn't necessary.
  echo If you want to tear down anyway, run dev-teardown.cmd with the --force flag
  exit /b 0
)

if "%1" NEQ "--force" (
  echo usage: dev-teardown.cmd [--force]
  exit /b 1
)

set NPM_CONFIG_PREFIX=%node-root%\npm-symlinks

echo -- Removing links for build tools --
cd %node-root%\build\tools
echo .
call npm rm azure-iothub

echo -- tearing down node_modules --
pushd "%node-root%\build\build_parallel"
call node build_parallel.js teardown
popd

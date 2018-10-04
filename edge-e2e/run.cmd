@REM Copyright (c) Microsoft. All rights reserved.
@REM Licensed under the MIT license. See LICENSE file in the project root for full license information.

@setlocal
@echo off

jshint "%~dp0\wrapper\nodejs-server-server\Service" && node "%~dp0\wrapper\nodejs-server-server\index.js"
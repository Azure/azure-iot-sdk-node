# Using/Debugging the Node.js SDK in Visual Studio Code

Visual Studio Code is a free, cross-platform, powerful code editor with advanced Node.js debugging capabilities. It's a great tool to explore the Node.js SDK code, run the samples, and build your own project.

This document describes how to configure [Visual Studio Code](http://code.visualstudio.com) to run and debug sample code and tests in the Node.js SDK

## Prepare your development environment
See: [Prepare your development environment](node-devbox-setup.md)

## Install Visual Studio Code
Download Visual Studio Code from [here](http://code.visualstudio.com)

## Create the configuration files
1. Create a `.vscode` folder at the root of the SDK repository.
2. Download [this GIST](https://gist.github.com/pierreca/aef0548d88b37a0f37d8) and save it as `launch.json` in the `.vscode` folder.

## Get started with Visual Studio Code
Suggested reads: 
- [Get started with Visual Studio Code](https://code.visualstudio.com/Docs)
- [Debugging with Visual Studio Code](https://code.visualstudio.com/Docs/editor/debugging)

## Debugging sample code files
The `Device Sample` section of [launch.json](https://gist.github.com/pierreca/aef0548d88b37a0f37d8) shows how to debug the sample code file. It's the default node debug configuration for Node.js using Visual Studio Code.
Simply put, we just set the 'program' property of the section to whichever file we want to debug. In this case, `device/samples/simple_sample_device.js`.
```json
{
	"name": "Device Sample",
	"type": "node",
	"request": "launch",
	"program": "device/samples/simple_sample_device.js",
	"stopOnEntry": false,
	"args": [],
	"cwd": ".",
	"runtimeExecutable": null,
	"runtimeArgs": [
		"--nolazy"
	],
	"env": {
		"NODE_ENV": "development",
		"DEBUG": "*"
	},
	"externalConsole": false,
	"sourceMaps": false,
	"outDir": null
}
```
## Debugging tests
The `Device Client Tests` section of [launch.json](https://gist.github.com/pierreca/aef0548d88b37a0f37d8) shows how to debug tests.
Basically, instead of giving the name of the javascript file we want to debug as it's the case in the device sample section, we want to start the mocha test engine, and give it the test files as an argument.
```json
{
	"name": "Device client tests",
	"type": "node",
	"request": "launch",
	"program": "device/core/node_modules/mocha/bin/_mocha",
	"stopOnEntry": false,
	"args": ["device/core/lib/_client_test.js"],
	"cwd": ".",
	"runtimeExecutable": null,
	"runtimeArgs": [
		"--nolazy"
	],
	"env": {
		"NODE_ENV": "development"
	},
	"externalConsole": false,
	"sourceMaps": false,
	"outDir": null
}
```

Running integration tests requires a little more configuration because integration and end-to-end tests require configuring some environment variables as describe in [running end-to-end tests](https://github.com/Azure/azure-iot-sdk-c/blob/master/doc/run_end_to_end_tests.md).
Luckily, we can edit environment variables directly in the debugger configuration file so that they are set only for the debugging session.
See the 'env' subsection of the 'Device client integration tests' section in [launch.json](https://gist.github.com/pierreca/aef0548d88b37a0f37d8) and fill in the blanks according to [the previously mentionned document](https://github.com/Azure/azure-iot-sdk-c/blob/master/doc/run_end_to_end_tests.md).
```json
{
	"name": "Device client integration tests",
	"type": "node",
	"request": "launch",
	"program": "device/transport/amqp/node_modules/mocha/bin/_mocha",
	"stopOnEntry": false,
	"args": ["device/transport/amqp/lib/_client_test_integration.js"],
	"cwd": ".",
	"runtimeExecutable": null,
	"runtimeArgs": [
		"--nolazy"
	],
	"env": {
              "IOTHUB_CONNECTION_STRING": "<CONNECTION_STRING>",
              "IOTHUB_DEVICE_ID": "<DEVICE_ID>",
              "IOTHUB_DEVICE_KEY": "<DEVICE_KEY>",
              "IOTHUB_EVENTHUB_CONNECTION_STRING": "<EVENTHUB_CONNECTION_STRING>",
              "IOTHUB_EVENTHUB_CONSUMER_GROUP": "<EVENTHUB_CONSUMER_GROUP>",
              "IOTHUB_EVENTHUB_LISTEN_NAME": "<EVENTHUB_LISTEN_NAME>",
              "IOTHUB_PARTITION_COUNT": "<PARTITION_COUNT>",
              "IOTHUB_SHARED_ACCESS_SIGNATURE": "<SHARED_ACCESS_SIGNATURE>"
	},
	"externalConsole": false,
	"sourceMaps": false,
	"outDir": null
}
```

## Debugging iothub-explorer
[iothub-explorer](https://github.com/Azure/iothub-explorer) is a lot like debugging the sample code file: we specify an iothub-explorer javascript file as the program to start.  Becuase the iothub-explorer main entry point spawns another process when it starts, you will get an error when attaching the debugger similar to:

```
Debugger listening on [::]:35919
Error: listen EADDRINUSE :::35919
```

Instead, you can run the file for the command you are trying to debug directly.  Each ```iothub-explorer-<command>.js``` file can be used an independent script.  See the example Visual Studio Code configuration below for an example of debugging the ```get``` device command.

You can also supply the connection string to the command in the configuration. Finally, if you'd rather run iothub-explorer in an interactive console (in which you can type) as opposed to the Visual Studio Code debug prompt, switch the `externalConsole` property to `true`.

```json
{
            "name": "iothub-explorer",
            "type": "node",
            "request": "launch",
            "program": "${workspaceRoot}/iothub-explorer-get.js",
            "stopOnEntry": false,
            "args": [
                "-l",
                "<connectionstring>",
                "<device-id>"
            ],
            "cwd": "${workspaceRoot}",
            "runtimeExecutable": null,
            "runtimeArgs": [
                "--nolazy"
            ],
            "env": {
                "NODE_ENV": "development"
            },
            "externalConsole": false,
            "sourceMaps": false,
            "outDir": null
        },
```

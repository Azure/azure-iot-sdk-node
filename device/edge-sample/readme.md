# Azure IoT Edge: node.js module sample

This folder contains a set of Dockerfiles which can be used to crate an Azure IoT Edge module using node.js which can be deployed and run inside of an Azure IoT Edge environment

## Implementation details

Because our build system relies heavily on the npm link command, and because our current code isn't available in the npm registry just yet, it is necessary to jump through a few (hopefully small) hoops to make this container work.

We do this by first building a base image which contains the azure-iot-sdk-node code from your current clone of the repository.  We do this once, assuming this code won't change.  If you do make changes to the various azure modules, or if you pull a new set of changes down, you will need to re-build the base image.  Otherwise, if the azure-iot-sdk-node code doesn't change, you can build it and forget about it.

The base imagew is perfectly usable as an edge module.  You can tag this and push it to your Docker image registry and it should work as is.

If you want to modify the edge_sample_module.js file, implement your own module, or use a remote debugger to debug the module, you can create an image on top of the base with the appropriate changes.  Details on this are below.

## WARNINGS

Do not use node:carbon images to build.  There are current incompatibilities with the Azure IoT SDK scripts and Node version 8.  Instead, use node:6 (currently at v6.12.3)

These steps will not work on a Windows device.  You need to run these steps with a *nix host.  (Windows is expected to work by GA)

## one-time setup

If you're running inside of a docker container, make sure to use node:6, and make sure to launch with -v to map the docker daemon socket into your container.  This is necessary to use the host docker instance to build an image from inside of your container.  You will also need to install Docker CE to get access to the docker CLI.

```
bertk@bertk-edge:~$ docker run -v /var/run/docker.sock:/var/run/docker.sock -it node:6 /bin/bash
root@2e1c0a98438e:/azure-iot-sdk-node# curl -sSL https://get.docker.com/ | sh
# Executing docker install script, commit: 02d7c3c
+ sh -c apt-get update -qq >/dev/null

<-- snip -->
```

If you haven't already done so, clone the repo and run dev-setup.sh
```
root@88bd7a1e504f:/# git clone https://www.github.com/Azure/azure-iot-sdk-node -b modules-docker && cd azure-iot-sdk-node && build/dev-setup.sh
Cloning into 'azure-iot-sdk-node'...

<-- snip -->
```

Finally, build the base image.  If you're inside of a Docker container at this point, you will be using the Docker daemon from the host.

```
root@aa2532356264:/azure-iot-sdk-node# cd device/edge-sample && ./build_base_image.sh
Sending build context to Docker daemon  52.27MB
Step 1/4 : FROM node:6-alpine

 <--snip-->

Successfully tagged iot-hub-module-base:latest
```

## Iterating

At this point, you have a base image and you can build images on top of it fairly quickly using the Dockerfile in this directory.

```
root@aa2532356264:/azure-iot-sdk-node/device/edge-sample# docker build -t my_module:latest .
Sending build context to Docker daemon  5.147MB
Step 1/5 : FROM iot-hub-module-base:latest
 ---> 19707dcd8af1

<-- snip -->

Successfully built 9121691fc4f5
Successfully tagged my_module:latest
```

This image can then be pushed to your docker image repository and referenced from the Azure Portal via Image URI as documented [here](https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-simulate-device-windows#deploy-a-module)

## A note about debugging

The Dockerfile referenced in the 'Iterating' step above exposes port 9229 and launches node with the --inspect flag.  There are two additional tricks here:
1. If you want to bind port 9229 to the host, you can follow the instructions [here](https://dariuszparys.github.io/2017/12/04/Understanding-IoT-Edge-Module-createOptions/) with the following create options
```
{
  "HostConfig": {
    "PortBindings": {
      "9229/tcp": [
        {
          "HostPort": "9229"
        }
      ]
    }
  }
}
```

2. If your Dockerfile launches node with the --inspect-brk option, you _may_ need to set the Restart Policy on your module to "never" as documented [here](https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-simulate-device-windows#deploy-a-module)

# Node Client Network failure end-to-end tests

Because the device client can operate in "less than ideal" network conditions we have to make sure it operates reliably over disconnections and reconnections.
This folder contains test code, scripts and dockerfile that are used with our gated build to run spotty connectivity tests.

## Network Tests Build Environment Setup

These tests are meant to run on an Azure VM running _Windows Server 2016 Datacenter with Containers_. It helps to provision it with a static IP and a public DNS name.

### Additional required components

- [Chocolatey](https://chocolatey.org/)
- [Node.js](https://nodejs.org/)
- [Git](https://git-scm.com/)

### Docker Configuration

Docker comes preinstalled on the VM, but not `docker-compose` which is also required. Here's a powershell command to do this easily (you can also download it from the docker-compose release page:
```
Invoke-WebRequest https://dl.bintray.com/docker-compose/master/docker-compose-Windows-x86_64.exe -UseBasicParsing -OutFile $env:ProgramFiles\docker\docker-compose.exe
```

In this series of tests, each test run within a container that disconnects its own connection using the `docker network disconnect <network> <container>` command on the underlying docker engine. For a container to run commands on this engine, the docker engine socket must be opened, configured, and accepting connections.

- **Firewall configuration**: Either using `powershell`, `netsh` or the Windows Firewall UI from the control panel, make sure you allow connections on port **2376** if you want to use TLS (recommended), **2375** otherwise (not recommended).

- [The DockerTLS tools](https://github.com/Microsoft/Virtualization-Documentation/tree/master/windows-server-container-tools/DockerTLS) help with installing OpenSSL and generating certificates. You may run an OpenSSL configuration error about not being able to find the config file. To solve this you should define the `OPENSSL_CONF` environment variable and set it to the `openssl.cfg` file full path. By default this file is found in the same directory as `openssl.exe`.
- [This article](https://stefanscherer.github.io/protecting-a-windows-2016-docker-engine-with-tls/) can also help setting up and running the `DockerTLS` tools.

The docker daemon configuration file (`C:\ProgramData\Docker\config\daemon.json`) needs to be edited with the following configuration:

```json
{
    "hosts": ["tcp://<container subnet>:2376"],
    "dns": ["<primary dns address>", "<secondary dns address>"],
    "tlsverify": true,
    "tlscacert": "<path-to-certs>\\ca.pem",
    "tlscert": "<path-to-certs>\\server-cert.pem",
    "tlskey": "<path-to-certs>\\server-key.pem"
}
```

[Reference for the docker daemon configuration file](https://docs.microsoft.com/en-us/virtualization/windowscontainers/manage-docker/configure-docker-daemon)

Please note:
- The `hosts` property is necessary independently of the firewall rule for docker to allow connections to the docker engine socket.
- You might not need the `dns` property - just check if your containers can resolve an external hostname by default
- You may choose to ignore all the tls parameters and go with the unsecure docker socket on port 2375. This is not recommended but can be useful for debugging

### Gotchas running the tests
- For docker containers to securely connect to the docker engine socket, they need the client certificates generated with the DockerTLS tools. The certificates shouldn't be checked in but can be stored on the host VM itself. In that case, you can volume-mount the folder containing these certificate and key files. Since we start the test containers using `docker-compose`, we need the `COMPOSE_CONVERT_WINDOWS_PATHS` environment variable to be set to `1` (Reference: https://github.com/docker/compose/issues/4303).
- If the connection to the docker engine gets denied, the most common causes or failure are:
  - Erroneous certificates
  - Firewall rule on the host machine not working
  - `hosts` property missing in the `daemon.json` config file. (http://blog.simontimms.com/2016/07/20/windows_docker_daemon/)

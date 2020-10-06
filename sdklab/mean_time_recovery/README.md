# Mean Time to Recovery SDK Metric Tests

## Generate the server certs

I used the following documentation to quickly generate the server certs: [Generating a self-signed certificate using OpenSSL](https://www.ibm.com/support/knowledgecenter/SSMNED_5.0.0/com.ibm.apic.cmc.doc/task_apionprem_gernerate_self_signed_openSSL.html)

The output you should result in is a `key.pem` file and a `certificate.pem` file in this folder. Also ensure that the server's common name is set to "localhost", to prevent any authentication issues from the device.

## To Run (Using Powershell)

1) Set the environment variables
```powershell
& $ENV:NODE_EXTRA_CA_CERTS="./certificate.pem"
& $ENV:DEBUG="orchestrator, device, aedes_server"
```

2) Run the orchestrator
```powershell
& node orchestrator.js
  aedes_server server started and listening on port 8883 +0ms
  device message received on child  { setKeepAlive: 20 } +0ms
  ...
```
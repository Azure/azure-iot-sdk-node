# IoT Node SDK TLS

When using the Azure IoT Node SDK in your application, you may wish to control which version of TLS is used and which ciphers are used by TLS.

## How to restrict TLS version

To restrict the TLS version one will need to set the NODE_OPTIONS environment variable to use the min version of the desired tls value

```
NODE_OPTIONS='--tls-min-v1.2'
```

## TLS Cipher Suites

Additionally if you would like to specify a list of ciphers can be restricted by adding a NODE_OPTIONS environment variable

```
NODE_OPTIONS='--tls-cipher-list=[cipher1]'
```

for more information see [Modifying the Default TLS Cipher suite](https://nodejs.org/api/tls.html#tls_modifying_the_default_tls_cipher_suite)

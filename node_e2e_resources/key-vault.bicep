@minLength(3)
@maxLength(24)
@description('The name of the Key Vault to be created')
param keyVaultName string

@description('Signed in user objectId')
param userObjectId string

// TODO: switch to object and use items() when released in Bicep v0.5
// https://github.com/Azure/bicep/pull/4456
param keyVaultSecrets array 

resource keyVault 'Microsoft.KeyVault/vaults@2019-09-01' = {
  name: keyVaultName
  location: resourceGroup().location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: [
      {
        objectId: userObjectId
        tenantId: subscription().tenantId
        permissions: {
          secrets: [
            'all'
          ]
          certificates: [
            'all'
          ]
          keys: [
            'all'
          ]
          storage: [
            'all'
          ]
        }
      }
    ]
  }

  resource secrets 'secrets' = [for secret in keyVaultSecrets: {
    name: secret.name
    properties: {
      value: secret.value
    }
  }]
}

output name string = keyVaultName

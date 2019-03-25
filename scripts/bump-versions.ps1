
# run the node.js app that bumps file versions

$sources = $env:BUILD_SOURCESDIRECTORY
$configFile = "$($sources)/scripts/version/config.json"
$app = "$($sources)/scripts/version/app.js"

if ($(Test-Path -Path $configFile -PathType Leaf) -ne $true) {
    throw "File not found: $($configFile)"
}

if ($(Test-Path -Path $app -PathType Leaf) -ne $true) {
    throw "File not found: $($app)"
}

node $app $configFile $sources
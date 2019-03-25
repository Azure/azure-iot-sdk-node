
# call npm pack on each sdk folder path to produce releasable outputs

$folders = @(
    'common/core',
    'common/transport/amqp',
    'common/transport/http',
    'common/transport/mqtt',
    'device/core',
    'device/transport/amqp',
    'device/transport/http',
    'device/transport/mqtt',
    'device/node-red',
    'service',
    'provisioning/service',
    'provisioning/device',
    'provisioning/transport/amqp',
    'provisioning/transport/mqtt',
    'provisioning/transport/http',
    'security/x509',
    'security/tpm',
    'security/symmetric')


$sources = $env:BUILD_SOURCESDIRECTORY
$agent = $env:AGENT_ROOTDIRECTORY

$tgzFolder = "$agent\tgz"  # tgzFolder folder path 
New-Item $tgzFolder -ItemType Directory  # make new tgzFolder folder

foreach ($folder in $folders) {

    $path = Join-Path $sources -ChildPath $folder  # archive file package root folder
    
    if ($(Test-Path $path -PathType Container) -ne $true) {
        throw "Folder not found: $($path)"
    }
    
    $packageFile = Join-Path $path -ChildPath 'package.json'  # archive file manifest
        
    if ($(Test-Path $packageFile -PathType Leaf) -ne $true) {
        throw "File not found: $($packageFile)"
    }
    
    Set-Location $path  # set working folder to project root\
    
    $archiveName = npm pack  # create archive file
    $archivePath = Join-Path $path -ChildPath $archiveName
    
    if ($(Test-Path $archivePath -PathType Leaf) -ne $true) {
        throw "File not found: $($archivePath)"
    }
        
    $destinationPath = Join-Path $tgzFolder -ChildPath $archiveName  # path to .tgz collection folder
    
    Move-Item $archivePath -Destination $destinationPath  # move .tgz to collection folder for publish
}
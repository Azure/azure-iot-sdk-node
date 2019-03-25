
# create a new release branch with annoated tag and push to git origin

[CmdletBinding()]
param
(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    
    [Parameter(Mandatory = $true)]
    [string]$Email
)

function TagExists($TagName, [switch]$Remote) {
    
    # look for the name in local refs/tags

    if ($Remote -eq $true) {

        foreach ($tag in $(git ls-remote --tags)) {

            $name = Split-Path $tag -Leaf
    
            if ($name -eq $TagName) {
                return $true
            }
        }
    }
    else {

        foreach ($tag in $(git tag)) {

            if ($tag -eq $TagName) {
                return $true
            }
        }
    }

    return $false
}

function ExitOrContinue {

    # stop only if prior git command failed

    Write-Host "Last exit code is ($LASTEXITCODE)"

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE  # terminate
    }
}

function CurrentBranch() {

    # find current branch name from git output

    foreach ($line in $(git branch)) {

        # git branch output marks the current branch with a leading astrisk

        if ($line.StartsWith('*')) {
            $line = $line.Replace('* ', '')
            return $line
        }
    }

    throw "Current branch not found"
}




# start:

$date = Get-Date -UFormat "%Y-%m-%d"
$branch = "release_$date"
$sources = $env:BUILD_SOURCESDIRECTORY

Write-Output "Set current directory to '$sources'"
Set-Location $sources

git config user.email $Email
git config user.name $Name

$message = "Bump package versions for release $date"

Write-Output "Create new branch '$($branch)'"

git checkout -b $branch
ExitOrContinue  # exit if we can't create the branch

$lastCommitId = git rev-list --tags --max-count=1
$lastTag = git describe $lastCommitId  # By default git describe only shows annotated tags.

Write-Output "Print commits from $lastTag..$branch"

git --no-pager log $lastTag..$branch --name-status

Write-Output "Add changes to commit"

git add .
ExitOrContinue  # exit if we can't add the changes

git commit -m $message
ExitOrContinue  # exit if we can't commit the changes

if ($(CurrentBranch) -eq 'master') {

    Write-Output "Can't continue: current branch is 'master' but should be '$($branch)'."
    exit -1
}

if ($(TagExists $date) -eq $true) {

    Write-Host "Delete local tag '$date'"
    git tag --delete $date
}

if ($(TagExists $date -Remote) -eq $true) {

    Write-Host "Delete remote tag '$date'"
    git push --delete origin $date
}

Write-Output "Create new tag '$($date)'"

git tag -a $date -m "SDK release on $date"
ExitOrContinue  # exit if we can't create a new tag
    
Write-Output "Push changes to origin"

git push --tags -u origin $branch  # push version changes
    
Write-Host "Git push finished with exit code ($($LASTEXITCODE))"

exit $LASTEXITCODE
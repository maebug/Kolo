<#
.SYNOPSIS
    Moves all files and subdirectories from an input directory into the container’s /app/qa_generation_input folder.

.DESCRIPTION
    This script accepts a directory path as input. It first checks that the directory exists.
    Then, it clears any existing content inside /app/qa_generation_input in the Docker container
    (assumed here to be named "kolo_container"). Finally, it copies (i.e. “moves”) all files and subdirectories
    from the input directory into /app/qa_generation_input inside the container.
    
    Note: Since Docker does not have a native "move" operation, this script uses docker cp to copy the files.
    If you need the source files to be deleted afterward, you can append a Remove-Item command on the source.
    
.PARAMETER SourceDir
    The path to the directory whose contents will be moved into the container.
    
.EXAMPLE
    .\copy_qa_input_generation.ps1 -SourceDir "C:\MyInputFiles"
#>

param (
    [Parameter(Mandatory = $true, HelpMessage = "Provide the source directory path.")]
    [string]$SourceDir
)

# Define the container name and destination path
$containerName = "kolo_container"
$destinationPath = "/var/kolo_data/qa_generation_input"

# Verify the source directory exists
if (-not (Test-Path $SourceDir)) {
    Write-Host "Error: Source directory does not exist: $SourceDir" -ForegroundColor Red
    exit 1
}

# Resolve the full path for the source directory
$sourceFullPath = (Resolve-Path $SourceDir).Path

Write-Host "Preparing to move files from '$sourceFullPath' into container '$containerName' at '$destinationPath'..." -ForegroundColor Cyan

# Clear the destination directory inside the container
Write-Host "Clearing existing contents in '$destinationPath' inside container '$containerName'..." -ForegroundColor Yellow
try {
    # We run the rm command via bash inside the container.
    # Using double quotes here causes PowerShell to substitute $destinationPath.
    docker exec $containerName bash -c "rm -rf $destinationPath/*"
    Write-Host "Successfully cleared contents of '$destinationPath' in container '$containerName'." -ForegroundColor Green
}
catch {
    Write-Host "An error occurred while clearing '$destinationPath' in container '$containerName': $_" -ForegroundColor Red
    exit 1
}

# Copy (i.e. move) the files and subdirectories into the container folder
Write-Host "Copying contents from '$sourceFullPath' to container '$containerName' at '$destinationPath'..." -ForegroundColor Yellow
try {
    # Using the trailing "/." ensures that only the contents of the folder (not the folder itself) are copied.
    $target = "${containerName}:$destinationPath"
    docker cp "$sourceFullPath/." $target
    Write-Host "Successfully copied files to '$target'." -ForegroundColor Green
}
catch {
    Write-Host "An error occurred while copying files from '$sourceFullPath' to '$target': $_" -ForegroundColor Red
    exit 1
}

Write-Host "Operation completed." -ForegroundColor Cyan

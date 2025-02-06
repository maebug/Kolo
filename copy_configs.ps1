# Define the source directory
$sourceDir = "./torchtune/"

# Define the container name
$containerName = "kolo_container"

# Define the destination path inside the container
$destinationPath = "/app/"

# Check if the source directory exists
if (-Not (Test-Path $sourceDir)) {
    Write-Host "Error: Source directory does not exist: $sourceDir" -ForegroundColor Red
    exit 1
}

# Resolve the full path for the source directory
$sourceFullPath = (Resolve-Path $sourceDir).Path

Write-Host "Copying folder '$sourceFullPath' to container '$containerName' at '$destinationPath'..."

try {
    # Construct the target specification using braces to delimit the variable name
    $target = "${containerName}:$destinationPath"
    
    # Copy the entire directory to the container
    docker cp $sourceFullPath $target

    Write-Host "Successfully copied '$sourceFullPath' to '$target'" -ForegroundColor Green
}
catch {
    Write-Host "An error occurred while copying '$sourceFullPath': $_" -ForegroundColor Red
    exit 1
}

Write-Host "Folder copy operation completed." -ForegroundColor Cyan

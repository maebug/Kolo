param (
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$DirFolder  # The directory inside /var/kolo_data/ to remove
)

# Define container name
$ContainerName = "kolo_container"

# Check if the container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$"

if (-Not $containerRunning) {
    Write-Host "Error: Container '$ContainerName' is not running." -ForegroundColor Red
    exit 1
}

# Check if the directory exists inside the container
$dirCheck = docker exec -it $ContainerName sh -c "if [ -d /var/kolo_data/$DirFolder ]; then echo 'exists'; else echo 'not_exists'; fi"

if ($dirCheck -match "not_exists") {
    Write-Host "Error: Directory '/var/kolo_data/$DirFolder' does not exist inside container '$ContainerName'." -ForegroundColor Red
    exit 1
}

# Confirm deletion with the user
Write-Host "WARNING: You are about to permanently delete the directory '/var/kolo_data/$DirFolder' inside the container '$ContainerName'." -ForegroundColor Yellow
$confirmation = Read-Host "Type the directory name again to confirm deletion"

if ($confirmation -ne $DirFolder) {
    Write-Host "Error: Confirmation failed. Directory names do not match. Aborting." -ForegroundColor Red
    exit 1
}

# Execute the remove command inside the container
try {
    Write-Host "Deleting '/var/kolo_data/$DirFolder' inside container '$ContainerName'..."
    docker exec -it $ContainerName rm -rf "/var/kolo_data/$DirFolder"

    if ($?) {
        Write-Host "Directory '/var/kolo_data/$DirFolder' removed successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "Failed to remove directory '/var/kolo_data/$DirFolder'." -ForegroundColor Red
    }
}
catch {
    Write-Host "An error occurred: $_" -ForegroundColor Red
}

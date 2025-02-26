# delete_qa_generation_output.ps1
# This script deletes the folder /var/kolo_data/qa_generation_output inside kolo_container.

# Define container name and target directory
$ContainerName = "kolo_container"
$FullPath = "/var/kolo_data/qa_generation_output"
$ConfirmPath = "/qa_generation_output"  # The user must type this exactly to confirm deletion

# Check if the container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$"
if (-Not $containerRunning) {
    Write-Host "Error: Container '$ContainerName' is not running." -ForegroundColor Red
    exit 1
}

# Check if the directory exists inside the container
$dirCheck = docker exec -it $ContainerName sh -c "if [ -d '$FullPath' ]; then echo 'exists'; else echo 'not_exists'; fi"
if ($dirCheck -match "not_exists") {
    Write-Host "Error: Directory '$FullPath' does not exist inside container '$ContainerName'." -ForegroundColor Red
    exit 1
}

# Inform the user exactly what to type to confirm deletion
Write-Host "WARNING: You are about to permanently delete the directory '$FullPath' inside container '$ContainerName'." -ForegroundColor Yellow
Write-Host "To confirm deletion, you MUST type EXACTLY the following directory path:" -ForegroundColor Cyan
Write-Host "`t$ConfirmPath" -ForegroundColor Cyan
$confirmation = Read-Host "Type the directory path to confirm deletion"

if ($confirmation -ne $ConfirmPath) {
    Write-Host "Error: Confirmation failed. The text you entered does not match '$ConfirmPath'. Aborting." -ForegroundColor Red
    exit 1
}

# Execute the remove command inside the container
try {
    Write-Host "Deleting '$FullPath' inside container '$ContainerName'..."
    docker exec -it $ContainerName rm -rf "$FullPath"

    if ($?) {
        Write-Host "Directory '$FullPath' removed successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "Failed to remove directory '$FullPath'." -ForegroundColor Red
    }
}
catch {
    Write-Host "An error occurred: $_" -ForegroundColor Red
}

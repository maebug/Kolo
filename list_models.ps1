# Define the container name
$containerName = "kolo_container"

# Define the target directories inside the container
$targetDirectories = @(
    "/var/kolo_data/torchtune",
    "/var/kolo_data/unsloth"
)

foreach ($dir in $targetDirectories) {
    Write-Host "Listing folders in $dir inside container $containerName" -ForegroundColor Cyan

    # Build the command to allow shell globbing
    $command = "docker"
    $cmd = "ls -d $dir/*/"  # Command to be executed inside the container
    $args = @("exec", $containerName, "sh", "-c", $cmd)

    try {
        # Execute the command and capture the output.
        $result = & $command @args 2>&1 | Out-String

        # Check the exit status of the docker command.
        if ($LASTEXITCODE -eq 0) {
            Write-Host $result -ForegroundColor Green
        }
        else {
            Write-Host "Error listing folders in $dir" -ForegroundColor Red
            Write-Host $result -ForegroundColor Red
        }
    }
    catch {
        Write-Host "An exception occurred while listing folders in $dir $_" -ForegroundColor Red
    }
    
    Write-Host "-------------------------------------" -ForegroundColor Yellow
}

Write-Host "Folder listing complete." -ForegroundColor Cyan

# Define the container name
$containerName = "kolo_container"

# Define the target directories inside the container
$targetDirectories = @(
    "/var/kolo_data/torchtune",
    "/var/kolo_data/unsloth"
)

foreach ($dir in $targetDirectories) {
    Write-Host "Listing folders in $dir inside container $containerName" -ForegroundColor Cyan

    # Build the command to allow shell globbing and suppress error messages if no folders are found.
    $command = "docker"
    $cmd = "ls -d $dir/*/ 2>/dev/null"  # ls will not print an error if no folder exists
    $args = @("exec", $containerName, "sh", "-c", $cmd)

    try {
        # Execute the command and capture the output.
        $result = & $command @args 2>&1 | Out-String

        # If the trimmed output is empty, no folders were found.
        if ($result.Trim().Length -eq 0) {
            Write-Host "No models found" -ForegroundColor Green
        }
        else {
            Write-Host $result -ForegroundColor Green
        }
    }
    catch {
        Write-Host "An exception occurred while listing folders in $dir $_" -ForegroundColor Red
    }
    
    Write-Host "-------------------------------------" -ForegroundColor Yellow
}

Write-Host "Folder listing complete." -ForegroundColor Cyan
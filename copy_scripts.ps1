# Define the source directory
$sourceDir = "./scripts/"
# Define the container
$containerName = "kolo_container"

# Check if the source directory exists
if (-Not (Test-Path $sourceDir)) {
    Write-Host "Error: Source directory does not exist: $sourceDir" -ForegroundColor Red
    exit 1
}

# Get all files in the source directory
$files = Get-ChildItem -Path $sourceDir -File

if ($files.Count -eq 0) {
    Write-Host "No files found in $sourceDir" -ForegroundColor Yellow
    exit 0
}

# Copy each file into the container's /app/ directory
foreach ($file in $files) {
    $filePath = $file.FullName
    $destinationPath = "/app/$($file.Name)"
    
    Write-Host "Copying $filePath to container $containerName at $destinationPath..."
    
    try {
        docker cp "$filePath" "$containerName`:$destinationPath"
        
        if ($?) {
            Write-Host "Successfully copied $file.Name" -ForegroundColor Green
        }
        else {
            Write-Host "Failed to copy $file.Name" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "An error occurred while copying $file.Name: $_" -ForegroundColor Red
    }
}

Write-Host "All files processed." -ForegroundColor Cyan

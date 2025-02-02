#./copy_training_data.ps1 -f "C:\path\to\file.txt""

param (
    [string]$f # Local file path
)

# Check if the file exists
if (-Not (Test-Path $f)) {
    Write-Host "Error: File does not exist at path: $f" -ForegroundColor Red
    exit 1
}

# Execute the docker cp command
try {
    Write-Host "Copying $f to container kolo_container at /app/data.jsonl..."
    docker cp $f "kolo_container`:/app/data.jsonl"
    
    if ($?) {
        Write-Host "File copied successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "Failed to copy file." -ForegroundColor Red
    }
}
catch {
    Write-Host "An error occurred: $_" -ForegroundColor Red
}

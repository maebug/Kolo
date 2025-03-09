# Define the source directory
$sourceDir = "./scripts/"
# Define the container
$containerName = "kolo_container"

# Check if the source directory exists
if (-Not (Test-Path $sourceDir)) {
    Write-Host "Error: Source directory does not exist: $sourceDir" -ForegroundColor Red
    exit 1
}

# Function to remove a file inside the container
function Remove-ContainerFile($container, $destinationPath) {
    docker exec $container rm -f $destinationPath | Out-Null
}

# Function to remove a folder inside the container
function Remove-ContainerFolder($container, $destinationPath) {
    docker exec $container rm -rf $destinationPath | Out-Null
}

# Copy files from the source directory
$files = Get-ChildItem -Path $sourceDir -File

if ($files.Count -gt 0) {
    foreach ($file in $files) {
        $filePath = $file.FullName
        $destinationPath = "/app/$($file.Name)"
        
        Write-Host "Removing any existing file at $destinationPath in container $containerName..."
        Remove-ContainerFile -container $containerName -destinationPath $destinationPath
        
        Write-Host "Copying file $filePath to container $containerName at $destinationPath..."
        
        try {
            docker cp "$filePath" "$containerName`:$destinationPath"
            
            if ($?) {
                Write-Host "Successfully copied $($file.Name)" -ForegroundColor Green
            }
            else {
                Write-Host "Failed to copy $($file.Name)" -ForegroundColor Red
            }
        }
        catch {
            Write-Host "An error occurred while copying $($file.Name): $_" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "No files found in $sourceDir" -ForegroundColor Yellow
}

# Copy directories from the source directory
$folders = Get-ChildItem -Path $sourceDir -Directory

if ($folders.Count -gt 0) {
    foreach ($folder in $folders) {
        $folderPath = $folder.FullName
        $destinationPath = "/app/$($folder.Name)"
        
        Write-Host "Removing any existing folder at $destinationPath in container $containerName..."
        Remove-ContainerFolder -container $containerName -destinationPath $destinationPath
        
        Write-Host "Copying folder $folderPath to container $containerName at $destinationPath..."
        
        try {
            docker cp "$folderPath" "$containerName`:$destinationPath"
            
            if ($?) {
                Write-Host "Successfully copied folder $($folder.Name)" -ForegroundColor Green
            }
            else {
                Write-Host "Failed to copy folder $($folder.Name)" -ForegroundColor Red
            }
        }
        catch {
            Write-Host "An error occurred while copying folder $($folder.Name): $_" -ForegroundColor Red
        }
    }
}
else {
    Write-Host "No folders found in $sourceDir" -ForegroundColor Yellow
}

Write-Host "All files and folders processed." -ForegroundColor Cyan

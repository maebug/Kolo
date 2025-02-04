param (
    [switch]$Clear
)

if ($Clear) {
    Write-Output "Clearing SSH keychain..."
    ssh-keygen -R "[localhost]:2222"
}

Write-Output "Connecting to remote server..."
ssh root@localhost -p 2222 -t "cd /app && bash"
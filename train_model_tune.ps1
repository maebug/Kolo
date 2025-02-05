<#
.SYNOPSIS
    Executes a torchtune LoRA/QLoRA finetuning run inside a Docker container,
    and then merges the resulting model using merge_lora.py.

.DESCRIPTION
    This script builds and runs a torchtune command for fine-tuning using the 
    "lora_finetune_single_device" recipe and the configuration "llama3_1/8B_qlora_single_device".
    After the finetuning completes, it identifies the epoch folder with the largest index
    (for example, /var/kolo_data/torchtune/outputs/epoch_2) and then runs a python script
    (/app/merge_lora.py) with:
        --lora_model set to the identified epoch folder, and
        --merged_model set to /var/kolo_data/torchtune/<OutputDir>/merged_model.

    (See the inline comments for details.)

.PARAMETER Epochs
    Number of training epochs. Default: 3

... [other parameter help as in your original script] ...

#>

param (
    [int]$Epochs,
    [double]$LearningRate,
    [string]$TrainData,
    [string]$BaseModel,
    [string]$ChatTemplate,
    [int]$LoraRank,
    [int]$LoraAlpha,
    [double]$LoraDropout,
    [int]$MaxSeqLength,
    [int]$WarmupSteps,
    [int]$SaveSteps,
    [int]$SaveTotalLimit,
    [int]$Seed,
    [string]$SchedulerType,
    [int]$BatchSize,
    [string]$OutputDir,
    [string]$Quantization,
    [double]$WeightDecay,
    [switch]$UseCheckpoint
)

# Log received parameters
Write-Host "Parameters passed:" -ForegroundColor Cyan
if ($Epochs) { Write-Host "Epochs: $Epochs" }
if ($LearningRate) { Write-Host "LearningRate: $LearningRate" }
if ($TrainData) { Write-Host "TrainData: $TrainData" }
if ($BaseModel) { Write-Host "BaseModel: $BaseModel" }
if ($ChatTemplate) { Write-Host "ChatTemplate: $ChatTemplate" }
if ($LoraRank) { Write-Host "LoraRank: $LoraRank" }
if ($LoraAlpha) { Write-Host "LoraAlpha: $LoraAlpha" }
if ($LoraDropout -ne $null) { Write-Host "LoraDropout: $LoraDropout" }
if ($MaxSeqLength) { Write-Host "MaxSeqLength: $MaxSeqLength" }
if ($WarmupSteps) { Write-Host "WarmupSteps: $WarmupSteps" }
if ($SaveSteps) { Write-Host "SaveSteps: $SaveSteps" }
if ($SaveTotalLimit) { Write-Host "SaveTotalLimit: $SaveTotalLimit" }
if ($Seed) { Write-Host "Seed: $Seed" }
if ($SchedulerType) { Write-Host "SchedulerType: $SchedulerType" }
if ($BatchSize) { Write-Host "BatchSize: $BatchSize" }
if ($OutputDir) { Write-Host "OutputDir: $OutputDir" } else { $OutputDir = "outputs" }
if ($Quantization) { Write-Host "Quantization: $Quantization" }
if ($WeightDecay) { Write-Host "WeightDecay: $WeightDecay" }
if ($UseCheckpoint) { Write-Host "UseCheckpoint: Enabled" } else { Write-Host "UseCheckpoint: Disabled" }

# Define the Docker container name
$ContainerName = "kolo_container"

# Check if the container is running
$containerRunning = docker ps --format "{{.Names}}" | Select-String -Pattern $ContainerName
if (-not $containerRunning) {
    Write-Host "Error: Container '$ContainerName' is not running." -ForegroundColor Red
    exit 1
}

# Build the base torchtune command string.
# The following fixed parameters match the default torchtune command:
#   tune run lora_finetune_single_device --config llama3_1/8B_qlora_single_device 
#       dataset.packed=False compile=True loss=torchtune.modules.loss.CEWithChunkedOutputLoss
#       enable_activation_checkpointing=True optimizer_in_bwd=False enable_activation_offloading=True
#       optimizer=torch.optim.AdamW tokenizer.max_seq_len=2048 gradient_accumulation_steps=1
#       epochs=3 batch_size=2 dataset.data_files=./data.json 
#       dataset._component_=torchtune.datasets.chat_dataset dataset.source=json 
#       dataset.conversation_column=conversations dataset.conversation_style=sharegpt 
#       model.lora_rank=32 model.lora_alpha=32

$command = "source /opt/conda/bin/activate kolo_env && tune run lora_finetune_single_device --config llama3_1/8B_qlora_single_device"

# Fixed command options
$command += " dataset.packed=False"
$command += " compile=True"
$command += " loss=torchtune.modules.loss.CEWithChunkedOutputLoss"
$command += " enable_activation_checkpointing=True"
$command += " optimizer_in_bwd=False"
$command += " enable_activation_offloading=True"
$command += " optimizer=torch.optim.AdamW"
$command += " tokenizer.max_seq_len=2048"
$command += " gradient_accumulation_steps=1"

# Dynamic parameters with defaults
if ($Epochs) {
    $command += " epochs=$Epochs"
}
else {
    $command += " epochs=1"
}

if ($BatchSize) {
    $command += " batch_size=$BatchSize"
}
else {
    $command += " batch_size=2"
}

if ($TrainData) {
    $command += " dataset.data_files='$TrainData'"
}
else {
    $command += " dataset.data_files=./data.json"
}

# Fixed dataset parameters
$command += " dataset._component_=torchtune.datasets.chat_dataset"
$command += " dataset.source=json"
$command += " dataset.conversation_column=conversations"
$command += " dataset.conversation_style=sharegpt"

if ($LoraRank) {
    $command += " model.lora_rank=$LoraRank"
}
else {
    $command += " model.lora_rank=32"
}

if ($LoraAlpha) {
    $command += " model.lora_alpha=$LoraAlpha"
}
else {
    $command += " model.lora_alpha=32"
}

if ($LoraDropout -ne $null) {
    $command += " model.lora_dropout=$LoraDropout"
}

if ($LearningRate) {
    $command += " optimizer.lr=$LearningRate"
}

if ($MaxSeqLength) {
    $command += " tokenizer.max_seq_len=$MaxSeqLength"
}

if ($WarmupSteps) {
    $command += " lr_scheduler.num_warmup_steps=$WarmupSteps"
}
else {
    $command += " lr_scheduler.num_warmup_steps=100"
}

if ($Seed) {
    $command += " seed=$Seed"
}

if ($SchedulerType) {
    $command += " lr_scheduler._component_=torchtune.training.lr_schedulers.get_${SchedulerType}_schedule_with_warmup"
}
else {
    $command += " lr_scheduler._component_=torchtune.training.lr_schedulers.get_cosine_schedule_with_warmup"
}

if ($WeightDecay) {
    $command += " optimizer.weight_decay=$WeightDecay"
}
else {
    $command += " optimizer.weight_decay=0.01"
}

if ($UseCheckpoint) {
    $command += " resume_from_checkpoint=True"
}
else {
    $command += " resume_from_checkpoint=False"
}

# Set the output directory; default is "outputs"
$FullOutputDir = "/var/kolo_data/torchtune/$OutputDir"
$command += " output_dir='$FullOutputDir'"

# Note: Parameters such as BaseModel, ChatTemplate, and Quantization are logged for reference
if ($BaseModel) {
    Write-Host "Note: BaseModel parameter '$BaseModel' is provided but is not used directly."
}
if ($ChatTemplate) {
    Write-Host "Note: ChatTemplate parameter '$ChatTemplate' is provided but is not used directly."
}
if ($Quantization) {
    Write-Host "Note: Quantization parameter '$Quantization' is provided but is not used by this recipe."
}

Write-Host "Executing command inside container '$ContainerName':" -ForegroundColor Yellow
Write-Host $command -ForegroundColor Yellow

# Execute the torchtune command inside the Docker container.
try {
    docker exec -it $ContainerName /bin/bash -c $command
    if ($?) {
        Write-Host "Torchtune run completed successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "Failed to execute torchtune run." -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "An error occurred during torchtune run: $_" -ForegroundColor Red
    exit 1
}

# --- Begin post-run merging steps ---

# Construct a command to find the epoch folder with the largest index.
# This command lists directories like "epoch_1", "epoch_2", etc., sorts them (version sort),
# and picks the last entry.
$findEpochCmd = "ls -d ${FullOutputDir}/epoch_* 2>/dev/null | sort -V | tail -n 1"

# Execute the command inside the container and capture its output.
try {
    $epochFolder = docker exec $ContainerName /bin/bash -c $findEpochCmd
    $epochFolder = $epochFolder.Trim()
    if (-not $epochFolder) {
        Write-Host "Error: No epoch folder found in $FullOutputDir" -ForegroundColor Red
        exit 1
    }
    else {
        Write-Host "Identified epoch folder: $epochFolder" -ForegroundColor Green
    }
}
catch {
    Write-Host "An error occurred while finding the epoch folder: $_" -ForegroundColor Red
    exit 1
}

# Set the merged model output path.
$mergedModelPath = "${FullOutputDir}/merged_model"

# Build the python command to run merge_lora.py.
# This command activates the conda environment, then runs the python script with the proper arguments.
$pythonCommand = "source /opt/conda/bin/activate kolo_env && python /app/merge_lora.py --lora_model '$epochFolder' --merged_model '$mergedModelPath'"

Write-Host "Executing merge command inside container '$ContainerName':" -ForegroundColor Yellow
Write-Host $pythonCommand -ForegroundColor Yellow

# Execute the merge command inside the container.
try {
    docker exec -it $ContainerName /bin/bash -c $pythonCommand
    if ($?) {
        Write-Host "Merge script executed successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "Failed to execute merge script." -ForegroundColor Red
    }
}
catch {
    Write-Host "An error occurred while executing the merge script: $_" -ForegroundColor Red
}

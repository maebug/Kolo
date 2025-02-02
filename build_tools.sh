#!/bin/bash
set -e  # Exit immediately if a command fails

# Update package list and install Python and dependencies
# apt update && apt install -y python3 python3-pip curl \
#     && apt clean && rm -rf /var/lib/apt/lists/*

# ------------------------------------------------------------------
# 2. Install System Packages (using sudo)
# ------------------------------------------------------------------
echo "Updating apt-get and installing system packages..."
apt update && apt install -y sudo
sudo apt-get update
sudo apt-get install -y build-essential curl git wget vim
sudo apt-get clean
sudo rm -rf /var/lib/apt/lists/*

# ------------------------------------------------------------------
# 3. Create a Workspace Directory (optional)
# ------------------------------------------------------------------
WORKSPACE_DIR="$HOME/workspace"
mkdir -p "$WORKSPACE_DIR"

# ------------------------------------------------------------------
# 4. Install Anaconda3 (if not already installed)
# ------------------------------------------------------------------
if [ ! -d "/opt/conda" ]; then
    echo "Downloading and installing Anaconda3..."
    wget https://repo.anaconda.com/archive/Anaconda3-2024.02-1-Linux-x86_64.sh -O anaconda.sh
    bash anaconda.sh -b -p /opt/conda
    rm anaconda.sh
else
    echo "Anaconda3 is already installed at /opt/conda."
fi

# ------------------------------------------------------------------
# 5. Initialize Conda for this Shell
# ------------------------------------------------------------------
eval "$(/opt/conda/bin/conda shell.bash hook)"

# ------------------------------------------------------------------
# 6. Create and Activate the Conda Environment
# ------------------------------------------------------------------
if ! conda env list | grep -q "kolo_env"; then
    echo "Creating conda environment 'kolo_env' with Python 3.10..."
    conda create -y --name kolo_env python=3.10
else
    echo "Conda environment 'kolo_env' already exists."
fi

echo "Activating the conda environment 'kolo_env'..."
conda activate kolo_env

# ------------------------------------------------------------------
# 7. Configure Conda and Install Conda Packages
# ------------------------------------------------------------------
echo "Setting conda remote timeout..."
conda config --set remote_read_timeout_secs 86400

echo "Installing PyTorch, CUDA toolkit, and xformers from conda channels..."
conda install -y pytorch-cuda=12.1 pytorch cudatoolkit xformers -c pytorch -c nvidia -c xformers

# ------------------------------------------------------------------
# 8. Configure pip and Install Python Packages via pip
# ------------------------------------------------------------------
echo "Setting pip global timeout..."
pip config set global.timeout 86400

echo "Installing common scientific libraries..."
pip install numpy datasets

echo "Installing unsloth..."
# pip install "unsloth[cu121-ampere-torch230] @ git+https://github.com/unslothai/unsloth.git"
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"

echo "Installing additional ML and utility packages..."
pip install --no-deps trl peft accelerate bitsandbytes
pip install transformers

# ------------------------------------------------------------------
# 9. Update Shell Initialization (Optional)
# ------------------------------------------------------------------
echo "Initializing conda for bash (if not already done)..."
/opt/conda/bin/conda init bash

if ! grep -q "conda activate kolo_env" ~/.bashrc; then
    echo "# Automatically activate the 'kolo_env' conda environment" >> ~/.bashrc
    echo "conda activate kolo_env" >> ~/.bashrc
fi

# Install Ollama
echo "Installing Ollama..."
curl -fsSL https://ollama.ai/install.sh | sh

echo "Installation and configuration complete."

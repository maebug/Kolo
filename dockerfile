# Use Ubuntu as the base image
FROM nvidia/cuda:12.1.1-devel-ubuntu22.04

RUN apt-get update && \
    apt-get install -y openssh-server sudo build-essential curl git wget vim && \
    rm -rf /var/lib/apt/lists/*

# Download and install Node.js v18.20.6 (with npm v10.8.2)
RUN curl -fsSL https://deb.nodesource.com/node_18.x/pool/main/n/nodejs/nodejs_18.20.6-1nodesource1_amd64.deb -o nodejs.deb && \
    dpkg -i nodejs.deb && \
    rm -f nodejs.deb /var/lib/apt/lists/*

# Create the SSH daemon run directory.
RUN mkdir /var/run/sshd

# Set the root password and update SSH config to permit root login.
RUN echo 'root:123' | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

RUN mkdir -p /workspace

# Install Anaconda3:
RUN wget https://repo.anaconda.com/archive/Anaconda3-2024.02-1-Linux-x86_64.sh -O anaconda.sh && \
    bash anaconda.sh -b -p /opt/conda && \
    rm anaconda.sh

# Create Kolo env
RUN /opt/conda/bin/conda create -y --name kolo_env python=3.10

# Run Kolo env
SHELL ["/opt/conda/bin/conda", "run", "-n", "kolo_env", "/bin/bash", "-c"]

RUN conda config --set remote_read_timeout_secs 86400

# Install torchtune
RUN pip install torch==2.6.0
RUN pip install torchvision==0.21.0
RUN pip install torchao==0.8.0
RUN pip install torchtune==0.6.0.dev20250224+cpu

# Create a Conda environment and install PyTorch with CUDA support and xformers
RUN --mount=type=cache,target=/opt/conda/pkgs \
    conda install -y \
    pytorch-cuda=12.1 \
    cudatoolkit=11.7.0 \
    xformers=0.0.29.post3 \
    -c pytorch -c nvidia -c xformers && \
    conda clean -afy

# Set a long timeout for pip commands.
RUN pip config set global.timeout 86400

# Install packages with exact version pins.
RUN pip install numpy==2.2.3 datasets==3.3.2

# Install unsloth from a specific commit (already frozen).
RUN pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git@038e6d4c8d40207a87297ab3aaf787c19b1006d1"

# Install additional ML/utility packages with version pins.
RUN pip install --no-deps trl==0.14.0 peft==0.14.0 accelerate==1.4.0 bitsandbytes==0.45.3

# Freeze transformers version.
RUN pip install transformers==4.49.0

# Upgrade Xformers to a specific version.
RUN pip install xformers==0.0.29.post3

# Install OpenAI with a fixed version.
RUN pip install openai==1.64.0

# Create Open-webui env
RUN /opt/conda/bin/conda create -y --name openwebui_env python=3.11

# Run openwebui env
SHELL ["/opt/conda/bin/conda", "run", "-n", "openwebui_env", "/bin/bash", "-c"]

#Install Open-webui
RUN pip install git+https://github.com/open-webui/open-webui.git@b72150c881955721a63ae7f4ea1b9ea293816fc1

SHELL ["/bin/bash", "-c"]

# Install Ollama.
RUN curl -fsSL https://ollama.com/install.sh | OLLAMA_VERSION=0.5.12 sh

# Set the working directory (optional).
WORKDIR /app

# Create a volume for persistent data.
VOLUME /var/kolo_data

RUN apt-get update && \
    apt-get install -y openssh-server supervisor && \
    rm -rf /var/lib/apt/lists/*

# Copy the supervisor configuration file
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Init the Conda env
RUN /opt/conda/bin/conda init bash

# Update ~/.bashrc
RUN echo '# activate conda env' | tee -a ~/.bashrc
RUN echo 'conda activate kolo_env' | tee -a ~/.bashrc
RUN echo '' | tee -a ~/.bashrc

# Expose necessary ports
EXPOSE 22 8080

RUN apt-get update && apt-get install -y cmake && apt-get clean

RUN git clone https://github.com/ggerganov/llama.cpp && \
    cd llama.cpp && \
    git checkout a82c9e7c23ef6db48cebfa194dc9cebbc4ac3552 && \
    cmake -B build && \
    cmake --build build --config Release


RUN mv llama.cpp/build/bin/llama-quantize llama.cpp/

# Copy scripts
COPY scripts /app/

# Copy torchtune configs
COPY torchtune /app/torchtune

# Set the entrypoint to start supervisord
CMD ["/usr/bin/supervisord"]
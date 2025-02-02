# Use Ubuntu as the base image
FROM ubuntu:latest

RUN apt-get update && \
    apt-get install -y openssh-server sudo build-essential curl git wget vim && \
    rm -rf /var/lib/apt/lists/*

# Create the SSH daemon run directory.
RUN mkdir /var/run/sshd

# Set the root password and update SSH config to permit root login.
RUN echo 'root:123' | chpasswd && \
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

RUN mkdir -p /workspace

SHELL ["/bin/bash", "-c"]

# Install Anaconda3:
RUN wget https://repo.anaconda.com/archive/Anaconda3-2024.02-1-Linux-x86_64.sh -O anaconda.sh && \
    bash anaconda.sh -b -p /opt/conda && \
    rm anaconda.sh

# Create a Conda env
RUN /opt/conda/bin/conda create -y --name kolo_env python=3.10

# Update SHELL
SHELL ["/opt/conda/bin/conda", "run", "-n", "kolo_env", "/bin/bash", "-c"]

RUN conda config --set remote_read_timeout_secs 86400

# Install PyTorch (with CUDA 12.1), cudatoolkit, and xformers.
RUN conda install -y pytorch-cuda=12.1 pytorch cudatoolkit xformers -c pytorch -c nvidia -c xformers

# Install unsloth and additional ML/utility packages.
RUN pip config set global.timeout 86400
RUN pip install numpy datasets
RUN pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
RUN pip install --no-deps trl peft accelerate bitsandbytes
RUN pip install transformers

# Install Ollama.
RUN curl -fsSL https://ollama.ai/install.sh | sh

# Set the working directory (optional).
WORKDIR /app

# Create a volume for persistent data.
VOLUME /var/kolo_data

RUN apt-get update && \
    apt-get install -y openssh-server supervisor && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create necessary directories
RUN mkdir -p /var/run/sshd

# Copy the supervisor configuration file
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose necessary ports
EXPOSE 22 8080

# Set the entrypoint to start supervisord
CMD ["/usr/bin/supervisord"]
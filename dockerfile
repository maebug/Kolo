# Use Ubuntu as the base image
FROM ubuntu:latest

# Update package list and install dependencies
RUN apt update && apt install -y python3 python3-pip curl \
    && apt clean && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.ai/install.sh | sh

# Copy the build script into the container
COPY build_tools.sh /build_tools.sh

# Make the build script executable
RUN chmod +x /build_tools.sh

# Start the build script in the background and then start an interactive shell
CMD /build_tools.sh > /dev/null 2>&1 & exec /bin/bash

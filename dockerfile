# Use Ubuntu as the base image
FROM ubuntu:latest

# Set the working directory (optional)
WORKDIR /app

# Copy the scripts into the container
COPY build_tools.sh /build_tools.sh
COPY start.sh /start.sh

# Make the scripts executable
RUN chmod +x /build_tools.sh /start.sh

# Create a volume for persistent build state
VOLUME /var/build_state

# Set the entry point to start.sh.
# The exec form (and passing "$@") allows you to pass extra commands if needed.
ENTRYPOINT ["/bin/bash", "/start.sh"]

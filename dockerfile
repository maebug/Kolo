# Use Ubuntu as the base image
FROM ubuntu:latest

# Avoid interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install OpenSSH server and clean up APT when done
RUN apt-get update && \
    apt-get install -y openssh-server && \
    rm -rf /var/lib/apt/lists/*

# Create the SSH daemon run directory
RUN mkdir /var/run/sshd

# Set the root password (change 'mysecretpassword' to a strong password of your choice)
RUN echo 'root:123' | chpasswd

# Configure SSH: allow root login via password (uncomment and update configuration)
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# Optionally, disable PAM authentication if needed (not always recommended)
# RUN sed -i 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' /etc/pam.d/sshd

# Expose SSH port
EXPOSE 22

# Start the SSH daemon in the foreground
CMD ["/usr/sbin/sshd", "-D"]

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

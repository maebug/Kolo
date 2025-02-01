# Use Ubuntu as the base image
FROM ubuntu:latest

# Update the package list and install Python
RUN apt update && apt install -y python3 python3-pip

# Set the default command to start an interactive shell
CMD ["/bin/bash"]
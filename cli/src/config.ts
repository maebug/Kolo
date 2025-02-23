/**
 * Docker configuration for kolo.
 */
export const dockerConfig = {
  /**
   * The name of the Docker image to build and run.
   */
  imageName: Deno.env.get("DOCKER_IMAGE_NAME") || "kolo",
  /**
   * The name of the Docker container to create.
   */
  containerName: Deno.env.get("DOCKER_CONTAINER_NAME") || "kolo_container",
  /**
   * The name of the Docker volume to create.
   */
  volumeName: Deno.env.get("DOCKER_VOLUME_NAME") || "kolo_volume",
  /**
   * The port to expose the SSH server on.
   */
  sshPort: parseInt(Deno.env.get("DOCKER_SSH_PORT") || "2222"),
  /**
   * The port to expose the web server on.
   */
  webPort: parseInt(Deno.env.get("DOCKER_WEB_PORT") || "8080"),
  /**
   * The path in the container to mount the volume to.
   */
  dataPath: Deno.env.get("DOCKER_DATA_PATH") || "/var/kolo_data",
  /**
   * The URL to direct users to for Docker installation instructions.
   */
  installUrl: "https://docs.docker.com/get-docker/",
}

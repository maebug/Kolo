export const dockerConfig = {
  imageName: Deno.env.get("DOCKER_IMAGE_NAME") || "kolo",
  containerName: Deno.env.get("DOCKER_CONTAINER_NAME") || "kolo_container",
  volumeName: Deno.env.get("DOCKER_VOLUME_NAME") || "kolo_volume",
  sshPort: parseInt(Deno.env.get("DOCKER_SSH_PORT") || "2222"),
  webPort: parseInt(Deno.env.get("DOCKER_WEB_PORT") || "8080"),
  dataPath: Deno.env.get("DOCKER_DATA_PATH") || "/var/kolo_data",
  installUrl: "https://docs.docker.com/get-docker/",
}

export const themeConfig = {
  primaryColor: Deno.env.get("THEME_PRIMARY_COLOR") || "#9D8CFF",
  secondaryColor: Deno.env.get("THEME_SECONDARY_COLOR") || "#64DD17",
}

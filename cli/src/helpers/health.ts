import { style } from "../colors.ts"
import { checkServicesHealth } from "../docker.ts"
import Table from "cli-table3"
import ora from "ora"
import terminalLink from "terminal-link"

export async function displayHealthCheck(
  message = "Checking services health...",
): Promise<void> {
  const healthSpinner = ora(message).start()
  const healthChecks = await checkServicesHealth()
  healthSpinner.succeed("Health check completed")

  const servicesTable = new Table({
    head: [
      style.title("Service"),
      style.title("URL"),
      style.title("Status"),
      style.title("Response Time"),
    ],
  })

  healthChecks.forEach((service) => {
    servicesTable.push([
      service.name,
      terminalLink.isSupported
        ? style.path(terminalLink(service.url, service.url))
        : style.path(service.url),
      service.isHealthy
        ? style.success("Healthy")
        : style.error("Not Responding"),
      service.responseTime
        ? style.secondary(`${service.responseTime}ms`)
        : style.error("N/A"),
    ])
  })

  console.log(servicesTable.toString())

  const unhealthyServices = healthChecks.filter((s) => !s.isHealthy)
  if (unhealthyServices.length > 0) {
    console.log(style.warning("\nWarning: Some services are not responding:"))
    unhealthyServices.forEach((service) => {
      console.log(style.error(`- ${service.name} (${service.url})`))
    })
  }
}

import { themeConfig } from "./config.ts"
import chalk from "chalk"

class Style {
  protected colors = {
    primary: chalk.hex(themeConfig.primaryColor),
    secondary: chalk.hex(themeConfig.secondaryColor),
    error: chalk.red,
    success: chalk.green,
  }

  // Base styles
  primary = (text: string) => this.colors.primary(text)
  secondary = (text: string) => this.colors.secondary(text)
  error = (text: string) => this.colors.error(text)
  success = (text: string) => this.colors.success(text)

  // Special styles
  command = (text: string) => this.colors.secondary.bold(text)
  path = (text: string) => this.colors.primary.underline(text)
  title = (text: string) => this.colors.primary.bold(text)
}

export const style = new Style()

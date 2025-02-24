import chalk from "chalk"

const colors = {
  primary: chalk.ansi256(92),
  secondary: chalk.ansi256(78),
  tertiary: chalk.ansi256(39),
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.blue,
  success: chalk.green,
}

export const style = Object.assign(chalk, {
  // Base styles
  primary: colors.primary,
  secondary: colors.secondary,
  tertiary: colors.tertiary,

  // Status styles
  error: colors.error,
  warning: colors.warning,
  info: colors.info,
  success: colors.success,

  // Special styles
  command: colors.secondary.bold,
  path: colors.primary.underline,
  title: colors.primary.bold,
})

import { Logger } from "@kontent-ai/migration-toolkit";
import chalk from "chalk";
import { Argv } from "yargs";

export type LogLevel =
  | "none"
  | "standard"
  | "verbose";

const logLevelsPriority: Readonly<Record<LogLevel, number>> = {
  none: 0,
  standard: 10,
  verbose: 20,
};

export const allLogLevels = Object.keys(logLevelsPriority);

type LoggableLogLevel = Exclude<LogLevel, "none">;

export const logError = (options: LogOptions, ...messages: ReadonlyArray<string>) =>
  logInternal(options, "standard", 'error', ...messages.map(m => `${chalk.red("Error:")} ${m}\n`));

export const logWarning = (
  options: LogOptions,
  logAtLevel: LoggableLogLevel,
  ...messages: ReadonlyArray<string>
) => logInternal(options, logAtLevel, 'warning', ...messages);

export const logInfo = (
  options: LogOptions,
  logAtLevel: LoggableLogLevel,
  ...messages: ReadonlyArray<string>
) => logInternal(options, logAtLevel, 'info', ...messages);

const logInternal = (
  options: LogOptions,
  thisMessageLogLevel: LoggableLogLevel,
  logLevel: 'error' | 'warning' | 'info',
  ...messages: ReadonlyArray<string>
) => {
  if (logLevelsPriority[optionsToLogLevel(options)] >= logLevelsPriority[thisMessageLogLevel]) {
    options.logger?.log({ message: messages.join(" "), type: logLevel });
  }
};

const optionsToLogLevel = (options: LogOptions): LogLevel => {
  if (options.verbose) {
    return "verbose";
  }

  const logLevel = options.logLevel || defaultLogLevel;
  if (!isLogLevel(logLevel)) {
    throw new Error(
      `There was an error in CLI arguments parsing. Log level "${options.logLevel}" is not a valid log level.`,
    );
  }

  return logLevel;
};

const isLogLevel = (input: string): input is LogLevel => allLogLevels.includes(input);

export type LogOptions = Readonly<{
  logLevel?: string;
  verbose?: boolean;
  logger?: Logger;
}>;

const defaultLogLevel: LogLevel = "standard";

export const addLogLevelOptions = <PreviousOptions>(inputYargs: Argv<PreviousOptions>): Argv<Omit<LogOptions, 'logger'>> =>
  inputYargs
    .option("logLevel", {
      type: "string",
      choices: allLogLevels,
      alias: "ll",
      describe: `Set the level of details you want to be printed. (default: ${defaultLogLevel})`,
    })
    .option("verbose", {
      type: "boolean",
      describe: "Set the log level to verbose. (alias for --logLevel=verbose)",
      conflicts: "logLevel",
    });

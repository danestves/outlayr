import * as Logger from "effect/Logger";

export const appLogger = Logger.layer([Logger.withLeveledConsole(Logger.formatSimple)]);

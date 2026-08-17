import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.logLevel,
  transport: env.isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

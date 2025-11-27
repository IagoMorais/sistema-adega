
import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private level: LogLevel;
  private logToFile: boolean;
  private logFilePath?: string;

  constructor(level: LogLevel = LogLevel.INFO, logToFile: boolean = false) {
    this.level = level;
    this.logToFile = logToFile;
    
    if (logToFile) {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const date = format(new Date(), 'yyyy-MM-dd');
      this.logFilePath = path.join(logDir, `app-${date}.log`);
    }
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (level < this.level) return;

    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    const levelStr = LogLevel[level];
    let logMessage = `[${timestamp}] [${levelStr}] ${message}`;
    
    if (data) {
      try {
        const dataStr = typeof data === 'object' ? JSON.stringify(data) : data.toString();
        logMessage += ` :: ${dataStr}`;
      } catch (error) {
        logMessage += ' :: [Data could not be stringified]';
      }
    }

    // Log to console
    switch (level) {
      case LogLevel.DEBUG:
      case LogLevel.INFO:
        console.log(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
        console.error(logMessage);
        break;
    }

    // Log to file if enabled
    if (this.logToFile && this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, logMessage + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }
}

// Criar uma instância global do logger
const logLevel = process.env.NODE_ENV === 'production' 
  ? LogLevel.INFO 
  : LogLevel.DEBUG;

const logToFile = process.env.LOG_TO_FILE === 'true';

export const logger = new Logger(logLevel, logToFile);

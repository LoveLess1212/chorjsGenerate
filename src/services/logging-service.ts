import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

type LogPayload = Record<string, unknown>;

export class LoggingService {
  private readonly sessionId: string;
  private readonly fileName: string;

  constructor(private readonly logDirectory = 'logs') {
    // Generate a unique ID for this instance/session
    this.sessionId = crypto.randomUUID();

    // Format date as DDMMYYYY
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    
    this.fileName = `${dd}${mm}${yyyy}-${this.sessionId}.log`;
  }

  async log(eventName: string, payload: LogPayload): Promise<void> {
    const timestamp = new Date().toISOString();
    const filePath = path.join(this.logDirectory, this.fileName);
    
    // Format the payload line by line
    const payloadLines = Object.entries(payload).map(([key, value]) => {
      // Stringify objects/arrays so they don't just output "[object Object]"
      const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
      return `  ${key}: ${displayValue}`;
    });

    // Construct the multiline log entry block
    const logEntry = [
      `[${timestamp}] EVENT: ${eventName}`,
      ...payloadLines,
      '--------------------------------------------------\n' // Separator for readability
    ].join('\n');

    await fs.mkdir(this.logDirectory, { recursive: true });
    await fs.appendFile(filePath, logEntry, 'utf8');
  }
}
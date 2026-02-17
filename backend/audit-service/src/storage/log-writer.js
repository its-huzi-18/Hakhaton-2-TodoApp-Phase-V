// Append-only log mechanism for Advanced Cloud Deployment

const fs = require('fs');
const path = require('path');
const { logWithContext, generateCorrelationId } = require('../../../shared/utils/logging-monitoring');

class AppendOnlyLog {
  constructor(logFilePath = './logs/audit.log', maxFileSize = 10 * 1024 * 1024) { // 10MB default
    this.logFilePath = logFilePath;
    this.maxFileSize = maxFileSize;
    this.ensureLogDirectory();
  }

  // Ensure the log directory exists
  ensureLogDirectory() {
    const logDir = path.dirname(this.logFilePath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  // Write an entry to the log file
  async writeEntry(entry) {
    const correlationId = generateCorrelationId();
    try {
      // Ensure the entry is in the correct format
      const logEntry = this.formatEntry(entry);
      
      // Check if the file needs to be rotated
      await this.rotateFileIfNeeded();
      
      // Write the entry to the log file
      await fs.promises.appendFile(this.logFilePath, logEntry + '\n');
      
      logWithContext(correlationId, 'Audit log entry written to append-only log', { 
        entryId: entry.id,
        filePath: this.logFilePath
      });
    } catch (error) {
      logWithContext(correlationId, 'Error writing audit log entry', { 
        error: error.message,
        entryId: entry.id
      });
      throw error;
    }
  }

  // Format an entry for logging
  formatEntry(entry) {
    // Create a standardized log entry format
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      entryId: entry.id,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      oldValues: entry.oldValues,
      newValues: entry.newValues,
      metadata: entry.metadata,
      source: entry.source,
      correlationId: entry.correlationId
    });
  }

  // Rotate the log file if it exceeds the maximum size
  async rotateFileIfNeeded() {
    try {
      // Check if the file exists
      if (!fs.existsSync(this.logFilePath)) {
        return;
      }

      // Get the file size
      const stats = await fs.promises.stat(this.logFilePath);
      if (stats.size >= this.maxFileSize) {
        // Create a backup of the current log file
        const backupPath = this.logFilePath + '.' + Date.now() + '.bak';
        await fs.promises.copyFile(this.logFilePath, backupPath);
        
        // Truncate the original file
        await fs.promises.truncate(this.logFilePath);
        
        const correlationId = generateCorrelationId();
        logWithContext(correlationId, 'Log file rotated due to size limit', { 
          originalSize: stats.size,
          backupPath,
          newFilePath: this.logFilePath
        });
      }
    } catch (error) {
      const correlationId = generateCorrelationId();
      logWithContext(correlationId, 'Error checking/rotating log file', { 
        error: error.message,
        filePath: this.logFilePath
      });
      // Don't throw the error as it's not critical to the logging operation
    }
  }

  // Read entries from the log file
  async readEntries(limit = 100, offset = 0) {
    const correlationId = generateCorrelationId();
    try {
      if (!fs.existsSync(this.logFilePath)) {
        logWithContext(correlationId, 'Log file does not exist', { filePath: this.logFilePath });
        return [];
      }

      // Read the entire log file
      const data = await fs.promises.readFile(this.logFilePath, 'utf8');
      const lines = data.trim().split('\n').filter(line => line);

      // Parse the log entries
      const entries = lines
        .map(line => {
          try {
            return JSON.parse(line);
          } catch (e) {
            logWithContext(correlationId, 'Error parsing log line', { 
              error: e.message,
              line
            });
            return null;
          }
        })
        .filter(entry => entry !== null)
        .reverse() // Newest first
        .slice(offset, offset + limit); // Apply offset and limit

      logWithContext(correlationId, 'Read audit log entries', { 
        count: entries.length,
        limit,
        offset
      });

      return entries;
    } catch (error) {
      logWithContext(correlationId, 'Error reading audit log entries', { 
        error: error.message,
        filePath: this.logFilePath
      });
      throw error;
    }
  }

  // Read entries by user ID
  async readEntriesByUser(userId, limit = 100, offset = 0) {
    const correlationId = generateCorrelationId();
    try {
      const allEntries = await this.readEntries(Number.MAX_SAFE_INTEGER);
      const userEntries = allEntries
        .filter(entry => entry.userId === userId)
        .slice(offset, offset + limit);

      logWithContext(correlationId, 'Read audit log entries for user', { 
        userId,
        count: userEntries.length,
        limit,
        offset
      });

      return userEntries;
    } catch (error) {
      logWithContext(correlationId, 'Error reading audit log entries by user', { 
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Read entries by entity type
  async readEntriesByEntityType(entityType, limit = 100, offset = 0) {
    const correlationId = generateCorrelationId();
    try {
      const allEntries = await this.readEntries(Number.MAX_SAFE_INTEGER);
      const entityEntries = allEntries
        .filter(entry => entry.entityType === entityType)
        .slice(offset, offset + limit);

      logWithContext(correlationId, 'Read audit log entries by entity type', { 
        entityType,
        count: entityEntries.length,
        limit,
        offset
      });

      return entityEntries;
    } catch (error) {
      logWithContext(correlationId, 'Error reading audit log entries by entity type', { 
        error: error.message,
        entityType
      });
      throw error;
    }
  }

  // Read entries by action type
  async readEntriesByAction(action, limit = 100, offset = 0) {
    const correlationId = generateCorrelationId();
    try {
      const allEntries = await this.readEntries(Number.MAX_SAFE_INTEGER);
      const actionEntries = allEntries
        .filter(entry => entry.action === action)
        .slice(offset, offset + limit);

      logWithContext(correlationId, 'Read audit log entries by action', { 
        action,
        count: actionEntries.length,
        limit,
        offset
      });

      return actionEntries;
    } catch (error) {
      logWithContext(correlationId, 'Error reading audit log entries by action', { 
        error: error.message,
        action
      });
      throw error;
    }
  }

  // Read entries within a date range
  async readEntriesByDateRange(startDate, endDate, limit = 100, offset = 0) {
    const correlationId = generateCorrelationId();
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      const allEntries = await this.readEntries(Number.MAX_SAFE_INTEGER);
      const dateRangeEntries = allEntries
        .filter(entry => {
          const entryDate = new Date(entry.timestamp);
          return entryDate >= start && entryDate <= end;
        })
        .slice(offset, offset + limit);

      logWithContext(correlationId, 'Read audit log entries by date range', { 
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        count: dateRangeEntries.length,
        limit,
        offset
      });

      return dateRangeEntries;
    } catch (error) {
      logWithContext(correlationId, 'Error reading audit log entries by date range', { 
        error: error.message,
        startDate,
        endDate
      });
      throw error;
    }
  }

  // Count total entries in the log
  async countEntries() {
    const correlationId = generateCorrelationId();
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return 0;
      }

      const data = await fs.promises.readFile(this.logFilePath, 'utf8');
      const lines = data.trim().split('\n').filter(line => line);

      logWithContext(correlationId, 'Counted audit log entries', { 
        total: lines.length,
        filePath: this.logFilePath
      });

      return lines.length;
    } catch (error) {
      logWithContext(correlationId, 'Error counting audit log entries', { 
        error: error.message,
        filePath: this.logFilePath
      });
      throw error;
    }
  }

  // Verify the integrity of the log (basic implementation)
  async verifyIntegrity() {
    const correlationId = generateCorrelationId();
    try {
      if (!fs.existsSync(this.logFilePath)) {
        logWithContext(correlationId, 'Log file does not exist, cannot verify integrity', { 
          filePath: this.logFilePath
        });
        return { valid: true, message: 'Log file does not exist, nothing to verify' };
      }

      const data = await fs.promises.readFile(this.logFilePath, 'utf8');
      const lines = data.trim().split('\n').filter(line => line);

      let validEntries = 0;
      let invalidEntries = 0;

      for (const line of lines) {
        try {
          JSON.parse(line);
          validEntries++;
        } catch (e) {
          invalidEntries++;
          logWithContext(correlationId, 'Invalid log entry detected', { 
            error: e.message,
            line
          });
        }
      }

      const isValid = invalidEntries === 0;
      const message = isValid 
        ? `Log integrity verified: ${validEntries} valid entries` 
        : `Log integrity check failed: ${invalidEntries} invalid entries out of ${lines.length}`;

      logWithContext(correlationId, message);

      return { 
        valid: isValid, 
        message,
        totalEntries: lines.length,
        validEntries,
        invalidEntries
      };
    } catch (error) {
      logWithContext(correlationId, 'Error verifying log integrity', { 
        error: error.message,
        filePath: this.logFilePath
      });
      throw error;
    }
  }

  // Get log file statistics
  async getLogStats() {
    const correlationId = generateCorrelationId();
    try {
      if (!fs.existsSync(this.logFilePath)) {
        return {
          exists: false,
          size: 0,
          entryCount: 0
        };
      }

      const stats = await fs.promises.stat(this.logFilePath);
      const entryCount = await this.countEntries();

      const logStats = {
        exists: true,
        size: stats.size,
        sizeFormatted: this.formatBytes(stats.size),
        entryCount: entryCount,
        lastModified: stats.mtime.toISOString(),
        isWritable: this.isWritable()
      };

      logWithContext(correlationId, 'Retrieved log file statistics', logStats);

      return logStats;
    } catch (error) {
      logWithContext(correlationId, 'Error getting log file statistics', { 
        error: error.message,
        filePath: this.logFilePath
      });
      throw error;
    }
  }

  // Format bytes to human-readable format
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Check if the log file is writable
  isWritable() {
    try {
      fs.accessSync(path.dirname(this.logFilePath), fs.constants.W_OK);
      if (fs.existsSync(this.logFilePath)) {
        fs.accessSync(this.logFilePath, fs.constants.W_OK);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  // Get the current log file path
  getLogFilePath() {
    return this.logFilePath;
  }

  // Change the log file path
  setLogFilePath(newPath) {
    this.logFilePath = newPath;
    this.ensureLogDirectory();
  }
}

module.exports = AppendOnlyLog;
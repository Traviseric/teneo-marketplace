// Audit logging service for admin actions
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class AuditService {
    constructor() {
        this.auditLogPath = path.join(__dirname, '../logs/admin-audit.log');
        this.initializeLogDirectory();
    }

    async initializeLogDirectory() {
        const logDir = path.dirname(this.auditLogPath);
        try {
            await fs.mkdir(logDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }

    async logAction(action) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            ...action,
            id: this.generateActionId()
        };

        try {
            // Format log entry
            const logLine = JSON.stringify(logEntry) + '\n';
            
            // Append to log file
            await fs.appendFile(this.auditLogPath, logLine);
            
            // Also log to console in development
            if (process.env.NODE_ENV !== 'production') {
                console.log('[AUDIT]', logEntry);
            }
            
            // In production, you might also want to:
            // - Send to external logging service (e.g., Datadog, CloudWatch)
            // - Store in database for querying
            // - Send alerts for sensitive actions
            
            return logEntry;
        } catch (error) {
            console.error('Failed to write audit log:', error);
            // Don't throw - audit logging should not break the application
        }
    }

    generateActionId() {
        return crypto.randomUUID();
    }

    async logAdminLogin(req, success, username = 'admin') {
        return this.logAction({
            action: 'ADMIN_LOGIN',
            username,
            success,
            ip: this.getClientIp(req),
            userAgent: req.get('user-agent'),
            sessionId: req.sessionID
        });
    }

    async logAdminLogout(req) {
        return this.logAction({
            action: 'ADMIN_LOGOUT',
            username: 'admin',
            ip: this.getClientIp(req),
            sessionId: req.sessionID
        });
    }

    async logDataAccess(req, resource, operation) {
        return this.logAction({
            action: 'DATA_ACCESS',
            resource,
            operation,
            method: req.method,
            path: req.path,
            ip: this.getClientIp(req),
            sessionId: req.sessionID
        });
    }

    async logDataModification(req, resource, operation, details = {}) {
        return this.logAction({
            action: 'DATA_MODIFICATION',
            resource,
            operation,
            method: req.method,
            path: req.path,
            details,
            ip: this.getClientIp(req),
            sessionId: req.sessionID
        });
    }

    async logSecurityEvent(req, event, details = {}) {
        return this.logAction({
            action: 'SECURITY_EVENT',
            event,
            details,
            ip: this.getClientIp(req),
            userAgent: req.get('user-agent'),
            sessionId: req.sessionID,
            severity: 'HIGH'
        });
    }

    async logFinancialAction(req, operation, amount, details = {}) {
        return this.logAction({
            action: 'FINANCIAL_OPERATION',
            operation,
            amount,
            currency: 'USD',
            details,
            ip: this.getClientIp(req),
            sessionId: req.sessionID,
            severity: 'CRITICAL'
        });
    }

    getClientIp(req) {
        return req.ip || 
               req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress || 
               'unknown';
    }

    // Query audit logs (for admin dashboard)
    async getRecentLogs(limit = 100) {
        try {
            const logContent = await fs.readFile(this.auditLogPath, 'utf8');
            const lines = logContent.trim().split('\n');
            const logs = lines
                .slice(-limit)
                .reverse()
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch {
                        return null;
                    }
                })
                .filter(Boolean);
            
            return logs;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return []; // No logs yet
            }
            throw error;
        }
    }

    // Rotate logs (call this from a cron job)
    async rotateLogs() {
        const timestamp = new Date().toISOString().split('T')[0];
        const archivePath = path.join(
            path.dirname(this.auditLogPath),
            `admin-audit-${timestamp}.log`
        );
        
        try {
            await fs.rename(this.auditLogPath, archivePath);
            console.log(`Audit log rotated to ${archivePath}`);
        } catch (error) {
            console.error('Failed to rotate audit log:', error);
        }
    }
}

// Singleton instance
const auditService = new AuditService();

module.exports = auditService;
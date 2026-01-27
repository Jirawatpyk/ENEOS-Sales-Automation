/**
 * Processing Status Service
 * Tracks background lead processing status
 */

import { logger } from '../utils/logger.js';

export interface ProcessingStatus {
  correlationId: string;
  email: string;
  company: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  rowNumber?: number;
  industry?: string;
  confidence?: number;
  error?: string;
  duration?: number;
}

/**
 * In-memory status store (for MVP)
 * TODO: Move to Redis for production scale
 */
class ProcessingStatusService {
  private statuses: Map<string, ProcessingStatus> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly TTL_MS = 3600000; // 1 hour

  /**
   * Create new processing status
   */
  create(correlationId: string, email: string, company: string): void {
    const status: ProcessingStatus = {
      correlationId,
      email,
      company,
      status: 'pending',
      startedAt: new Date().toISOString(),
    };

    this.statuses.set(correlationId, status);

    logger.debug('Processing status created', { correlationId, email });

    // Auto-cleanup after TTL with tracked timer reference
    const timer = setTimeout(() => {
      this.statuses.delete(correlationId);
      this.timers.delete(correlationId);
      logger.debug('Processing status expired', { correlationId });
    }, this.TTL_MS);

    this.timers.set(correlationId, timer);
  }

  /**
   * Update status to processing
   */
  startProcessing(correlationId: string): void {
    const status = this.statuses.get(correlationId);
    if (!status) {
      logger.warn('Cannot start processing - status not found', { correlationId });
      return;
    }
    status.status = 'processing';
    this.statuses.set(correlationId, status);
  }

  /**
   * Mark as completed
   */
  complete(
    correlationId: string,
    rowNumber: number,
    industry: string,
    confidence?: number,
    duration?: number
  ): void {
    const status = this.statuses.get(correlationId);
    if (!status) {
      logger.warn('Cannot complete - status not found', { correlationId });
      return;
    }
    status.status = 'completed';
    status.completedAt = new Date().toISOString();
    status.rowNumber = rowNumber;
    status.industry = industry;
    status.confidence = confidence;
    status.duration = duration;
    this.statuses.set(correlationId, status);

    logger.debug('Processing status completed', { correlationId, rowNumber });
  }

  /**
   * Mark as failed
   */
  fail(correlationId: string, error: string, duration?: number): void {
    const status = this.statuses.get(correlationId);
    if (!status) {
      logger.warn('Cannot mark as failed - status not found', { correlationId });
      return;
    }
    status.status = 'failed';
    status.completedAt = new Date().toISOString();
    status.error = error;
    status.duration = duration;
    this.statuses.set(correlationId, status);

    logger.debug('Processing status failed', { correlationId, error });
  }

  /**
   * Get status by correlation ID
   */
  get(correlationId: string): ProcessingStatus | null {
    return this.statuses.get(correlationId) || null;
  }

  /**
   * Delete status and clear its timer (for manual cleanup)
   */
  delete(correlationId: string): boolean {
    const timer = this.timers.get(correlationId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(correlationId);
    }
    return this.statuses.delete(correlationId);
  }

  /**
   * Get all statuses (for debugging)
   */
  getAll(): ProcessingStatus[] {
    return Array.from(this.statuses.values());
  }

  /**
   * Clear all statuses (for testing)
   */
  clear(): void {
    // Clear all timers to prevent memory leaks
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.statuses.clear();
  }
}

// Singleton instance
export const processingStatusService = new ProcessingStatusService();

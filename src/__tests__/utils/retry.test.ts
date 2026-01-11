/**
 * Retry Utility Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry, CircuitBreaker } from '../../utils/retry.js';

describe('Retry Utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('withRetry', () => {
    it('should return result on first successful call', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error and succeed', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce('success');

      const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });

      // Fast-forward timers
      await vi.runAllTimersAsync();

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max attempts', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('ECONNRESET'));

      // Start the retry and handle the rejection
      try {
        const promise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });
        await vi.runAllTimersAsync();
        await promise;
        // Should not reach here
        expect.fail('Expected error to be thrown');
      } catch (error) {
        expect((error as Error).message).toBe('ECONNRESET');
      }

      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable error', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Custom error'));

      await expect(withRetry(fn, { maxAttempts: 3 })).rejects.toThrow('Custom error');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback on each retry', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce('success');
      const onRetry = vi.fn();

      const promise = withRetry(fn, {
        maxAttempts: 3,
        baseDelayMs: 100,
        onRetry,
      });

      await vi.runAllTimersAsync();
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });
  });

  describe('CircuitBreaker', () => {
    it('should execute function when closed', async () => {
      const cb = new CircuitBreaker(3, 1000);
      const fn = vi.fn().mockResolvedValue('success');

      const result = await cb.execute(fn);

      expect(result).toBe('success');
      expect(cb.getState()).toBe('closed');
    });

    it('should open after threshold failures', async () => {
      const cb = new CircuitBreaker(3, 1000);
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      // Fail 3 times
      for (let i = 0; i < 3; i++) {
        await expect(cb.execute(fn)).rejects.toThrow('fail');
      }

      expect(cb.getState()).toBe('open');
    });

    it('should reject immediately when open', async () => {
      const cb = new CircuitBreaker(1, 60000);
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      await expect(cb.execute(fn)).rejects.toThrow('fail');
      expect(cb.getState()).toBe('open');

      // Should reject without calling fn
      await expect(cb.execute(fn)).rejects.toThrow('Circuit breaker is open');
      expect(fn).toHaveBeenCalledTimes(1); // Only the first call
    });

    it('should reset to closed after successful call in half-open', async () => {
      vi.useRealTimers();

      const cb = new CircuitBreaker(1, 100); // Short timeout for test
      const failFn = vi.fn().mockRejectedValue(new Error('fail'));
      const successFn = vi.fn().mockResolvedValue('success');

      // Open the circuit
      await expect(cb.execute(failFn)).rejects.toThrow('fail');
      expect(cb.getState()).toBe('open');

      // Wait for timeout
      await new Promise((r) => setTimeout(r, 150));

      // Should be half-open now, try success
      const result = await cb.execute(successFn);
      expect(result).toBe('success');
      expect(cb.getState()).toBe('closed');
    });

    it('should allow manual reset', async () => {
      const cb = new CircuitBreaker(1, 60000);
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      // Open the circuit
      await expect(cb.execute(fn)).rejects.toThrow('fail');
      expect(cb.getState()).toBe('open');

      // Manual reset
      cb.reset();
      expect(cb.getState()).toBe('closed');
    });
  });
});

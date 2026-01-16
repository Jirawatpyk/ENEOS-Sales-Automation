/**
 * LINE Validator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateLineWebhook,
  parsePostbackData,
  isPostbackEvent,
  isMessageEvent,
  isFromGroup,
  LINE_EVENT_TYPES,
} from '../../validators/line.validator.js';
import { mockPostbackEvent, mockLineWebhookBody } from '../mocks/line.mock.js';

describe('LINE Validator', () => {
  describe('validateLineWebhook', () => {
    it('should validate correct webhook body', () => {
      const result = validateLineWebhook(mockLineWebhookBody);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.events).toHaveLength(1);
    });

    it('should validate body with multiple events', () => {
      const body = {
        destination: 'U123',
        events: [mockPostbackEvent, mockPostbackEvent],
      };

      const result = validateLineWebhook(body);

      expect(result.success).toBe(true);
      expect(result.data?.events).toHaveLength(2);
    });

    it('should validate body with empty events', () => {
      const body = {
        destination: 'U123',
        events: [],
      };

      const result = validateLineWebhook(body);

      expect(result.success).toBe(true);
      expect(result.data?.events).toHaveLength(0);
    });

    it('should reject body without destination', () => {
      const result = validateLineWebhook({
        events: [mockPostbackEvent],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('destination');
    });

    it('should reject body without events array', () => {
      const result = validateLineWebhook({
        destination: 'U123',
      });

      expect(result.success).toBe(false);
    });

    it('should reject null body', () => {
      const result = validateLineWebhook(null);

      expect(result.success).toBe(false);
    });
  });

  describe('parsePostbackData', () => {
    it('should parse valid postback data', () => {
      const result = parsePostbackData('action=contacted&row_id=42');

      expect(result).toEqual({
        action: 'contacted',
        rowId: 42,
      });
    });

    it('should parse all valid actions', () => {
      const actions = ['new', 'claimed', 'contacted', 'unreachable', 'closed', 'lost'];

      actions.forEach((action) => {
        const result = parsePostbackData(`action=${action}&row_id=1`);
        expect(result?.action).toBe(action);
      });
    });

    it('should return null for invalid action', () => {
      const result = parsePostbackData('action=invalid&row_id=42');

      expect(result).toBeNull();
    });

    it('should return null for missing action', () => {
      const result = parsePostbackData('row_id=42');

      expect(result).toBeNull();
    });

    it('should return null for missing row_id', () => {
      const result = parsePostbackData('action=contacted');

      expect(result).toBeNull();
    });

    it('should return null for invalid row_id', () => {
      const result = parsePostbackData('action=contacted&row_id=invalid');

      expect(result).toBeNull();
    });

    it('should return null for zero row_id', () => {
      const result = parsePostbackData('action=contacted&row_id=0');

      expect(result).toBeNull();
    });

    it('should return null for negative row_id', () => {
      const result = parsePostbackData('action=contacted&row_id=-1');

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parsePostbackData('');

      expect(result).toBeNull();
    });

    it('should handle different parameter order', () => {
      const result = parsePostbackData('row_id=42&action=contacted');

      // URLSearchParams handles any order correctly
      expect(result).toEqual({
        action: 'contacted',
        rowId: 42,
      });
    });

    // UUID-based postback tests (Migration Support)
    describe('UUID-based postback parsing', () => {
      it('should parse valid lead_id with lead_ prefix', () => {
        const result = parsePostbackData('action=contacted&lead_id=lead_550e8400-e29b-41d4-a716-446655440000');

        expect(result).toEqual({
          action: 'contacted',
          leadId: 'lead_550e8400-e29b-41d4-a716-446655440000',
        });
      });

      it('should parse both lead_id and row_id together', () => {
        const result = parsePostbackData('action=contacted&lead_id=lead_550e8400-e29b-41d4-a716-446655440000&row_id=42');

        expect(result).toEqual({
          action: 'contacted',
          leadId: 'lead_550e8400-e29b-41d4-a716-446655440000',
          rowId: 42,
        });
      });

      it('should accept raw UUID format for backward compatibility', () => {
        const result = parsePostbackData('action=contacted&lead_id=550e8400-e29b-41d4-a716-446655440000');

        expect(result).toEqual({
          action: 'contacted',
          leadId: '550e8400-e29b-41d4-a716-446655440000',
        });
      });

      it('should reject invalid short lead_id without row_id fallback', () => {
        const result = parsePostbackData('action=contacted&lead_id=short');

        expect(result).toBeNull();
      });

      it('should fallback to row_id when lead_id is invalid', () => {
        const result = parsePostbackData('action=contacted&lead_id=short&row_id=42');

        expect(result).toEqual({
          action: 'contacted',
          rowId: 42,
        });
        expect(result?.leadId).toBeUndefined();
      });

      it('should parse claimed action (added for completeness)', () => {
        const result = parsePostbackData('action=claimed&lead_id=lead_550e8400-e29b-41d4-a716-446655440000');

        expect(result).toEqual({
          action: 'claimed',
          leadId: 'lead_550e8400-e29b-41d4-a716-446655440000',
        });
      });
    });
  });

  describe('isPostbackEvent', () => {
    it('should return true for postback event', () => {
      expect(isPostbackEvent(mockPostbackEvent)).toBe(true);
    });

    it('should return false for message event', () => {
      const messageEvent = {
        ...mockPostbackEvent,
        type: 'message',
        postback: undefined,
        message: { type: 'text', id: '123', text: 'Hello' },
      };

      expect(isPostbackEvent(messageEvent)).toBe(false);
    });

    it('should return false for postback type without postback data', () => {
      const event = {
        ...mockPostbackEvent,
        postback: undefined,
      };

      expect(isPostbackEvent(event)).toBe(false);
    });
  });

  describe('isMessageEvent', () => {
    it('should return true for message event', () => {
      const messageEvent = {
        ...mockPostbackEvent,
        type: 'message',
        postback: undefined,
        message: { type: 'text', id: '123', text: 'Hello' },
      };

      expect(isMessageEvent(messageEvent)).toBe(true);
    });

    it('should return false for postback event', () => {
      expect(isMessageEvent(mockPostbackEvent)).toBe(false);
    });
  });

  describe('isFromGroup', () => {
    it('should return true for group event', () => {
      expect(isFromGroup(mockPostbackEvent)).toBe(true);
    });

    it('should return false for user event', () => {
      const userEvent = {
        ...mockPostbackEvent,
        source: {
          type: 'user',
          userId: 'U123456789',
        },
      };

      expect(isFromGroup(userEvent)).toBe(false);
    });
  });

  describe('LINE_EVENT_TYPES', () => {
    it('should have correct event type constants', () => {
      expect(LINE_EVENT_TYPES.MESSAGE).toBe('message');
      expect(LINE_EVENT_TYPES.POSTBACK).toBe('postback');
      expect(LINE_EVENT_TYPES.FOLLOW).toBe('follow');
      expect(LINE_EVENT_TYPES.UNFOLLOW).toBe('unfollow');
      expect(LINE_EVENT_TYPES.JOIN).toBe('join');
      expect(LINE_EVENT_TYPES.LEAVE).toBe('leave');
    });
  });
});

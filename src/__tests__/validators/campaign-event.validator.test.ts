/**
 * ENEOS Sales Automation - Campaign Event Validator Tests
 * Unit tests for Brevo Campaign Event webhook validation
 */

import { describe, it, expect } from 'vitest';
import {
  campaignEventSchema,
  validateCampaignEvent,
  normalizeCampaignEventPayload,
  type CampaignEventInput,
  type NormalizedCampaignEvent,
} from '../../validators/campaign-event.validator.js';

// ===========================================
// Test Data
// ===========================================

const validPayload = {
  URL: 'https://myCampaignUrl.net',
  camp_id: 123,
  'campaign name': 'My First Campaign',
  date_event: '2020-10-09 00:00:00',
  date_sent: '2020-10-09 00:00:00',
  email: 'example@domain.com',
  event: 'click',
  id: 456,
  segment_ids: [1, 10],
  tag: 'promo',
  ts: 1604937337,
  ts_event: 1604933737,
  ts_sent: 1604933619,
};

const deliveredPayload = {
  camp_id: 100,
  'campaign name': 'Newsletter',
  email: 'test@example.com',
  event: 'delivered',
  id: 789,
};

const openedPayload = {
  camp_id: 200,
  'campaign name': 'Weekly Update',
  email: 'user@company.com',
  event: 'opened',
  id: 1000,
  date_event: '2026-01-30 10:00:00',
};

// ===========================================
// Schema Validation Tests
// ===========================================

describe('campaignEventSchema', () => {
  describe('Valid Payloads', () => {
    it('should accept a complete valid payload with all fields', () => {
      const result = campaignEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.camp_id).toBe(123);
        expect(result.data.email).toBe('example@domain.com');
        expect(result.data.event).toBe('click');
        expect(result.data.id).toBe(456);
      }
    });

    it('should accept minimal valid payload (required fields only)', () => {
      const minimal = {
        camp_id: 1,
        email: 'test@test.com',
        event: 'delivered',
        id: 1,
      };
      const result = campaignEventSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('should accept delivered event', () => {
      const result = campaignEventSchema.safeParse(deliveredPayload);
      expect(result.success).toBe(true);
    });

    it('should accept opened event', () => {
      const result = campaignEventSchema.safeParse(openedPayload);
      expect(result.success).toBe(true);
    });

    it('should accept click event with URL', () => {
      const result = campaignEventSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.URL).toBe('https://myCampaignUrl.net');
      }
    });

    it('should handle campaign name with space', () => {
      const payload = {
        camp_id: 1,
        'campaign name': 'Test Campaign With Spaces',
        email: 'test@test.com',
        event: 'click',
        id: 1,
      };
      const result = campaignEventSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data['campaign name']).toBe('Test Campaign With Spaces');
      }
    });

    it('should accept empty segment_ids array', () => {
      const payload = {
        ...validPayload,
        segment_ids: [],
      };
      const result = campaignEventSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept empty tag', () => {
      const payload = {
        ...validPayload,
        tag: '',
      };
      const result = campaignEventSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid Payloads', () => {
    it('should reject missing camp_id', () => {
      const invalid = {
        email: 'test@test.com',
        event: 'click',
        id: 1,
      };
      const result = campaignEventSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing email', () => {
      const invalid = {
        camp_id: 1,
        event: 'click',
        id: 1,
      };
      const result = campaignEventSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const invalid = {
        camp_id: 1,
        email: 'not-an-email',
        event: 'click',
        id: 1,
      };
      const result = campaignEventSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing event', () => {
      const invalid = {
        camp_id: 1,
        email: 'test@test.com',
        id: 1,
      };
      const result = campaignEventSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const invalid = {
        camp_id: 1,
        email: 'test@test.com',
        event: 'click',
      };
      const result = campaignEventSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-number camp_id', () => {
      const invalid = {
        camp_id: 'abc',
        email: 'test@test.com',
        event: 'click',
        id: 1,
      };
      const result = campaignEventSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-number id', () => {
      const invalid = {
        camp_id: 1,
        email: 'test@test.com',
        event: 'click',
        id: 'abc',
      };
      const result = campaignEventSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject null payload', () => {
      const result = campaignEventSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it('should reject undefined payload', () => {
      const result = campaignEventSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });
  });

  describe('Future Event Types (Prepared)', () => {
    it('should accept hard_bounce event', () => {
      const payload = {
        camp_id: 1,
        email: 'bounced@invalid.com',
        event: 'hard_bounce',
        id: 1,
      };
      const result = campaignEventSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept soft_bounce event', () => {
      const payload = {
        camp_id: 1,
        email: 'soft@temp.com',
        event: 'soft_bounce',
        id: 1,
      };
      const result = campaignEventSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept unsubscribe event', () => {
      const payload = {
        camp_id: 1,
        email: 'unsub@user.com',
        event: 'unsubscribe',
        id: 1,
      };
      const result = campaignEventSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('should accept spam event', () => {
      const payload = {
        camp_id: 1,
        email: 'spam@report.com',
        event: 'spam',
        id: 1,
      };
      const result = campaignEventSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });
});

// ===========================================
// Normalize Function Tests
// ===========================================

describe('normalizeCampaignEventPayload', () => {
  it('should normalize campaign name field (with space) to campaignName', () => {
    const input: CampaignEventInput = {
      camp_id: 123,
      'campaign name': 'My Campaign',
      email: 'test@test.com',
      event: 'click',
      id: 456,
    };
    const result = normalizeCampaignEventPayload(input);
    expect(result.campaignName).toBe('My Campaign');
  });

  it('should convert camp_id to campaignId', () => {
    const input: CampaignEventInput = {
      camp_id: 999,
      email: 'test@test.com',
      event: 'delivered',
      id: 1,
    };
    const result = normalizeCampaignEventPayload(input);
    expect(result.campaignId).toBe(999);
  });

  it('should lowercase and trim email', () => {
    const input: CampaignEventInput = {
      camp_id: 1,
      email: '  TEST@Example.COM  ',
      event: 'opened',
      id: 1,
    };
    const result = normalizeCampaignEventPayload(input);
    expect(result.email).toBe('test@example.com');
  });

  it('should use id as eventId', () => {
    const input: CampaignEventInput = {
      camp_id: 1,
      email: 'test@test.com',
      event: 'click',
      id: 12345,
    };
    const result = normalizeCampaignEventPayload(input);
    expect(result.eventId).toBe(12345);
  });

  it('should preserve event type', () => {
    const input: CampaignEventInput = {
      camp_id: 1,
      email: 'test@test.com',
      event: 'hard_bounce',
      id: 1,
    };
    const result = normalizeCampaignEventPayload(input);
    expect(result.event).toBe('hard_bounce');
  });

  it('should handle optional URL field', () => {
    const input: CampaignEventInput = {
      camp_id: 1,
      email: 'test@test.com',
      event: 'click',
      id: 1,
      URL: 'https://example.com/link',
    };
    const result = normalizeCampaignEventPayload(input);
    expect(result.url).toBe('https://example.com/link');
  });

  it('should handle missing URL as empty string', () => {
    const input: CampaignEventInput = {
      camp_id: 1,
      email: 'test@test.com',
      event: 'delivered',
      id: 1,
    };
    const result = normalizeCampaignEventPayload(input);
    expect(result.url).toBe('');
  });

  it('should handle optional tag field', () => {
    const input: CampaignEventInput = {
      camp_id: 1,
      email: 'test@test.com',
      event: 'click',
      id: 1,
      tag: 'promo2024',
    };
    const result = normalizeCampaignEventPayload(input);
    expect(result.tag).toBe('promo2024');
  });

  it('should handle segment_ids array', () => {
    const input: CampaignEventInput = {
      camp_id: 1,
      email: 'test@test.com',
      event: 'click',
      id: 1,
      segment_ids: [1, 2, 3],
    };
    const result = normalizeCampaignEventPayload(input);
    expect(result.segmentIds).toEqual([1, 2, 3]);
  });

  it('should handle empty segment_ids', () => {
    const input: CampaignEventInput = {
      camp_id: 1,
      email: 'test@test.com',
      event: 'click',
      id: 1,
      segment_ids: [],
    };
    const result = normalizeCampaignEventPayload(input);
    expect(result.segmentIds).toEqual([]);
  });

  it('should handle missing segment_ids as empty array', () => {
    const input: CampaignEventInput = {
      camp_id: 1,
      email: 'test@test.com',
      event: 'click',
      id: 1,
    };
    const result = normalizeCampaignEventPayload(input);
    expect(result.segmentIds).toEqual([]);
  });

  it('should parse date_event to eventAt', () => {
    const input: CampaignEventInput = {
      camp_id: 1,
      email: 'test@test.com',
      event: 'click',
      id: 1,
      date_event: '2026-01-30 10:30:00',
    };
    const result = normalizeCampaignEventPayload(input);
    expect(result.eventAt).toBe('2026-01-30 10:30:00');
  });

  it('should parse date_sent to sentAt', () => {
    const input: CampaignEventInput = {
      camp_id: 1,
      email: 'test@test.com',
      event: 'click',
      id: 1,
      date_sent: '2026-01-30 09:00:00',
    };
    const result = normalizeCampaignEventPayload(input);
    expect(result.sentAt).toBe('2026-01-30 09:00:00');
  });

  it('should handle missing campaign name', () => {
    const input: CampaignEventInput = {
      camp_id: 1,
      email: 'test@test.com',
      event: 'click',
      id: 1,
    };
    const result = normalizeCampaignEventPayload(input);
    expect(result.campaignName).toBe('');
  });
});

// ===========================================
// Validate Function Tests
// ===========================================

describe('validateCampaignEvent', () => {
  it('should return success with normalized data for valid payload', () => {
    const result = validateCampaignEvent(validPayload);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.campaignId).toBe(123);
    expect(result.data?.campaignName).toBe('My First Campaign');
    expect(result.data?.email).toBe('example@domain.com');
    expect(result.data?.event).toBe('click');
    expect(result.data?.eventId).toBe(456);
  });

  it('should return error for invalid payload', () => {
    const invalid = { foo: 'bar' };
    const result = validateCampaignEvent(invalid);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  it('should include field paths in error messages', () => {
    const invalid = {
      camp_id: 1,
      email: 'invalid-email',
      event: 'click',
      id: 1,
    };
    const result = validateCampaignEvent(invalid);
    expect(result.success).toBe(false);
    expect(result.error).toContain('email');
  });

  it('should handle unknown fields gracefully (passthrough)', () => {
    const payload = {
      ...validPayload,
      unknown_field: 'should be ignored',
      extra_data: { nested: true },
    };
    const result = validateCampaignEvent(payload);
    expect(result.success).toBe(true);
  });
});

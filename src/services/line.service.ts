/**
 * ENEOS Sales Automation - LINE Messaging Service
 * Enterprise-grade LINE OA integration
 */

import { Client, ClientConfig, FlexMessage, TextMessage, Profile } from '@line/bot-sdk';
import { createHmac } from 'crypto';
import { config } from '../config/index.js';
import { lineLogger as logger } from '../utils/logger.js';
import { withRetry, CircuitBreaker } from '../utils/retry.js';
import { LeadRow, LineUserProfile } from '../types/index.js';
import { createLeadFlexMessage, createSuccessReplyMessage, createErrorReplyMessage, createClaimedReplyMessage, createStatusUpdateMessage } from '../templates/flex-message.js';

// ===========================================
// LINE Client Setup
// ===========================================

const clientConfig: ClientConfig = {
  channelAccessToken: config.line.channelAccessToken,
  channelSecret: config.line.channelSecret,
};

const client = new Client(clientConfig);
const circuitBreaker = new CircuitBreaker(5, 60000);

// ===========================================
// Main Service Class
// ===========================================

export class LineService {
  private groupId: string;

  constructor() {
    this.groupId = config.line.groupId;
  }

  // ===========================================
  // Push Messages
  // ===========================================

  /**
   * Send new lead notification to sales group
   */
  async pushLeadNotification(lead: LeadRow, aiAnalysis: {
    industry: string;
    talkingPoint: string;
    website?: string | null;
    registeredCapital?: string | null;
  }): Promise<void> {
    if (!config.features.lineNotifications) {
      logger.info('LINE notifications disabled, skipping');
      return;
    }

    logger.info('Pushing lead notification', {
      rowNumber: lead.rowNumber,
      company: lead.company,
    });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const flexMessage = createLeadFlexMessage(lead, aiAnalysis);

        await client.pushMessage(this.groupId, flexMessage);

        logger.info('Lead notification sent successfully', {
          rowNumber: lead.rowNumber,
        });
      }, {
        maxAttempts: 3,
        baseDelayMs: 1000,
      });
    });
  }

  /**
   * Push a text message to the sales group
   */
  async pushTextMessage(text: string): Promise<void> {
    if (!config.features.lineNotifications) {
      logger.info('LINE notifications disabled, skipping');
      return;
    }

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const message: TextMessage = {
          type: 'text',
          text,
        };

        await client.pushMessage(this.groupId, message);
        logger.info('Text message pushed', { textPreview: text.substring(0, 50) });
      });
    });
  }

  // ===========================================
  // Reply Messages
  // ===========================================

  /**
   * Reply to a postback event with success message
   */
  async replySuccess(
    replyToken: string,
    salesName: string,
    companyName: string,
    customerName: string,
    status: string
  ): Promise<void> {
    logger.info('Sending success reply', { salesName, companyName, status });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const message = createSuccessReplyMessage(salesName, companyName, customerName, status);
        await client.replyMessage(replyToken, message);
      });
    });
  }

  /**
   * Reply with "already claimed" message
   */
  async replyClaimed(
    replyToken: string,
    companyName: string,
    customerName: string,
    ownerName: string
  ): Promise<void> {
    logger.info('Sending claimed reply', { companyName, ownerName });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const message = createClaimedReplyMessage(companyName, customerName, ownerName);
        await client.replyMessage(replyToken, message);
      });
    });
  }

  /**
   * Reply with status update confirmation
   */
  async replyStatusUpdate(
    replyToken: string,
    companyName: string,
    status: string,
    isClosedSale: boolean = false,
    isLostSale: boolean = false
  ): Promise<void> {
    logger.info('Sending status update reply', { companyName, status });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const message = createStatusUpdateMessage(companyName, status, isClosedSale, isLostSale);
        await client.replyMessage(replyToken, message);
      });
    });
  }

  /**
   * Reply with error message
   */
  async replyError(replyToken: string, errorMessage?: string): Promise<void> {
    logger.warn('Sending error reply', { errorMessage });

    try {
      const message = createErrorReplyMessage(errorMessage);
      await client.replyMessage(replyToken, message);
    } catch (error) {
      // Reply tokens expire quickly, log but don't throw
      logger.error('Failed to send error reply (token may have expired)', { error });
    }
  }

  // ===========================================
  // User Profile
  // ===========================================

  /**
   * Get user profile from LINE
   */
  async getUserProfile(userId: string): Promise<LineUserProfile> {
    logger.debug('Getting user profile', { userId });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const profile = await client.getProfile(userId);

        return {
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage,
        };
      });
    });
  }

  /**
   * Get group member profile
   */
  async getGroupMemberProfile(groupId: string, userId: string): Promise<LineUserProfile> {
    logger.debug('Getting group member profile', { groupId, userId });

    return circuitBreaker.execute(async () => {
      return withRetry(async () => {
        const profile = await client.getGroupMemberProfile(groupId, userId);

        return {
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        };
      });
    });
  }

  // ===========================================
  // Signature Verification
  // ===========================================

  /**
   * Verify LINE webhook signature
   */
  verifySignature(body: string, signature: string): boolean {
    const hash = createHmac('sha256', config.line.channelSecret)
      .update(body)
      .digest('base64');

    return hash === signature;
  }

  // ===========================================
  // Health Check
  // ===========================================

  /**
   * Check LINE API connectivity
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number }> {
    const start = Date.now();

    try {
      // Try to get bot info (lightweight API call)
      await client.getBotInfo();

      return {
        healthy: true,
        latency: Date.now() - start,
      };
    } catch (error) {
      logger.error('Health check failed', { error });
      return {
        healthy: false,
        latency: Date.now() - start,
      };
    }
  }

  // ===========================================
  // Escalation & Reminders
  // ===========================================

  /**
   * Send escalation alert for unclaimed leads
   */
  async sendEscalationAlert(leads: LeadRow[], hoursWaiting: number): Promise<void> {
    if (leads.length === 0) return;

    logger.warn('Sending escalation alert', {
      leadCount: leads.length,
      hoursWaiting,
    });

    const leadList = leads
      .slice(0, 5) // Max 5 leads in message
      .map((l) => `• ${l.company} (คุณ${l.customerName})`)
      .join('\n');

    const moreText = leads.length > 5 ? `\n... และอีก ${leads.length - 5} รายการ` : '';

    const text = `⚠️ แจ้งเตือน: มี Hot Lead รอนานกว่า ${hoursWaiting} ชั่วโมง!

${leadList}${moreText}

กรุณารับเคสด่วน!`;

    await this.pushTextMessage(text);
  }
}

// Export singleton instance
export const lineService = new LineService();

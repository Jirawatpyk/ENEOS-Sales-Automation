/**
 * ENEOS Sales Automation - LINE Flex Message Templates
 * Beautiful, interactive card messages for sales team
 */

import { FlexMessage, TextMessage, FlexBubble, FlexBox } from '@line/bot-sdk';
import { LeadRow } from '../types/index.js';
import { formatPhoneDisplay, createTelUri } from '../utils/phone-formatter.js';

// ===========================================
// Color Palette (ENEOS Branding)
// ===========================================

const COLORS = {
  primary: '#CD0000',      // ENEOS Red
  success: '#0F9D58',      // Green
  warning: '#F4B400',      // Yellow
  error: '#DB4437',        // Red
  info: '#4285F4',         // Blue
  dark: '#333333',
  medium: '#666666',
  light: '#aaaaaa',
  white: '#FFFFFF',
  background: '#F8F8F8',
  aiAccent: '#E65C00',     // Orange for AI insights
};

// ===========================================
// New Lead Notification (Flex Message)
// ===========================================

export function createLeadFlexMessage(
  lead: LeadRow,
  aiAnalysis: {
    industry: string;
    talkingPoint: string;
    website?: string | null;
    registeredCapital?: string | null;
  }
): FlexMessage {
  const phoneDisplay = formatPhoneDisplay(lead.phone);
  const telUri = createTelUri(lead.phone);

  const bubble: FlexBubble = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '🔥 NEW LEAD',
              weight: 'bold',
              color: COLORS.white,
              size: 'lg',
              flex: 1,
            },
            ...(lead.source ? [{
              type: 'text' as const,
              text: lead.source,
              color: COLORS.white,
              size: 'sm' as const,
              align: 'end' as const,
            }] : []),
          ],
        },
      ],
      backgroundColor: COLORS.primary,
      paddingAll: 'lg',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        // Company & Contact Info Section
        {
          type: 'text',
          text: 'CUSTOMER INFORMATION',
          weight: 'bold',
          color: COLORS.light,
          size: 'xs',
        },
        {
          type: 'text',
          text: lead.company || 'ไม่ระบุบริษัท',
          weight: 'bold',
          size: 'lg',
          margin: 'sm',
          wrap: true,
          color: COLORS.dark,
        },
        {
          type: 'text',
          text: `ผู้ติดต่อ: ${lead.customerName || 'ไม่ระบุ'}${lead.jobTitle ? ` (${lead.jobTitle})` : ''}`,
          size: 'sm',
          color: COLORS.medium,
          wrap: true,
        },

        // Separator
        {
          type: 'separator',
          margin: 'lg',
        },

        // AI Insight Section
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          contents: [
            {
              type: 'text',
              text: '🤖 AI BUSINESS INSIGHT',
              size: 'xs',
              color: COLORS.aiAccent,
              weight: 'bold',
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                {
                  type: 'text',
                  text: 'อุตสาหกรรม:',
                  size: 'xs',
                  color: COLORS.light,
                  flex: 4,
                },
                {
                  type: 'text',
                  text: aiAnalysis.industry || 'ไม่ระบุ',
                  size: 'xs',
                  color: COLORS.dark,
                  flex: 6,
                  wrap: true,
                },
              ],
            },
            ...(lead.juristicId ? [
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: 'เลขทะเบียนนิติบุคคล:',
                    size: 'xs',
                    color: COLORS.light,
                    flex: 4,
                  },
                  {
                    type: 'text',
                    text: lead.juristicId,
                    size: 'xs',
                    color: COLORS.dark,
                    flex: 6,
                    wrap: true,
                  },
                ],
              } as FlexBox,
            ] : []),
            ...(aiAnalysis.registeredCapital ? [
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: 'ทุนจดทะเบียน:',
                    size: 'xs',
                    color: COLORS.light,
                    flex: 4,
                  },
                  {
                    type: 'text',
                    text: aiAnalysis.registeredCapital,
                    size: 'xs',
                    color: COLORS.dark,
                    flex: 6,
                    wrap: true,
                  },
                ],
              } as FlexBox,
            ] : []),
            ...(aiAnalysis.website ? [
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: 'เว็บไซต์:',
                    size: 'xs',
                    color: COLORS.light,
                    flex: 4,
                  },
                  {
                    type: 'text',
                    text: aiAnalysis.website,
                    size: 'xs',
                    color: COLORS.info,
                    flex: 6,
                    wrap: true,
                    action: {
                      type: 'uri',
                      uri: aiAnalysis.website.startsWith('http') ? aiAnalysis.website : `https://${aiAnalysis.website}`,
                    },
                  },
                ],
              } as FlexBox,
            ] : []),
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              paddingAll: 'sm',
              backgroundColor: '#FFF8E1',
              cornerRadius: 'md',
              contents: [
                {
                  type: 'text',
                  text: `💡 ${aiAnalysis.talkingPoint}`,
                  size: 'xs',
                  color: COLORS.dark,
                  wrap: true,
                },
              ],
            },
          ],
        },

        // Separator
        {
          type: 'separator',
          margin: 'lg',
        },

        // Contact Details Section
        {
          type: 'box',
          layout: 'vertical',
          margin: 'lg',
          contents: [
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: '📞 Phone:',
                  size: 'sm',
                  color: COLORS.light,
                  flex: 2,
                },
                {
                  type: 'text',
                  text: phoneDisplay || 'ไม่ระบุ',
                  size: 'sm',
                  color: COLORS.dark,
                  flex: 5,
                  align: 'end',
                  action: lead.phone ? {
                    type: 'uri',
                    label: 'โทร',
                    uri: telUri,
                  } : undefined,
                },
              ],
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'sm',
              contents: [
                {
                  type: 'text',
                  text: '📧 Email:',
                  size: 'sm',
                  color: COLORS.light,
                  flex: 2,
                },
                {
                  type: 'text',
                  text: lead.email || 'ไม่ระบุ',
                  size: 'sm',
                  color: COLORS.dark,
                  flex: 5,
                  align: 'end',
                  action: lead.email ? {
                    type: 'uri',
                    label: 'ส่งอีเมล',
                    uri: `mailto:${lead.email}`,
                  } : undefined,
                },
              ],
            },
          ],
        },
      ],
      paddingAll: 'lg',
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        // Primary Action: Accept Case
        {
          type: 'button',
          style: 'primary',
          height: 'sm',
          action: {
            type: 'postback',
            label: '✅ รับเคสนี้',
            data: createPostbackData('contacted', lead),
            displayText: `รับเคส: ${lead.company}`,
          },
          color: COLORS.success,
        },
        // Unreachable Button
        {
          type: 'button',
          style: 'secondary',
          height: 'sm',
          action: {
            type: 'postback',
            label: '❌ ติดต่อไม่ได้',
            data: createPostbackData('unreachable', lead),
            displayText: `ติดต่อไม่ได้: ${lead.company}`,
          },
        },
        // Close Actions: Success / Failed
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              flex: 1,
              action: {
                type: 'postback',
                label: '💰 ปิดการขาย',
                data: createPostbackData('closed', lead),
                displayText: `ปิดการขายสำเร็จ: ${lead.company}`,
              },
            },
            {
              type: 'button',
              style: 'secondary',
              height: 'sm',
              flex: 1,
              action: {
                type: 'postback',
                label: '📉 ปิดไม่สำเร็จ',
                data: createPostbackData('lost', lead),
                displayText: `ปิดไม่สำเร็จ: ${lead.company}`,
              },
            },
          ],
        },
      ],
      paddingAll: 'lg',
      backgroundColor: COLORS.background,
    },
  };

  return {
    type: 'flex',
    altText: `🔔 มีลูกค้าใหม่สนใจสินค้า: ${lead.company}`,
    contents: bubble,
  };
}

// ===========================================
// Reply Messages
// ===========================================

export function createSuccessReplyMessage(
  salesName: string,
  companyName: string,
  customerName: string,
  status: string
): TextMessage {
  const statusText = getStatusText(status);

  return {
    type: 'text',
    text: `✅ รับทราบครับ!\n\nคุณ ${salesName} รับเคส ${companyName} (คุณ${customerName}) แล้ว\n\nสถานะ: ${statusText}`,
  };
}

export function createClaimedReplyMessage(
  companyName: string,
  customerName: string,
  ownerName: string
): TextMessage {
  return {
    type: 'text',
    text: `❌ ไม่ทันครับ!\n\nเคส ${companyName} (คุณ${customerName}) นี้ คุณ ${ownerName} รับไปแล้วครับ`,
  };
}

export function createStatusUpdateMessage(
  companyName: string,
  status: string,
  isClosedSale: boolean,
  isLostSale: boolean
): TextMessage {
  if (isClosedSale) {
    return {
      type: 'text',
      text: `💰 สุดยอดครับ!\n\nยินดีด้วยที่ปิดเคส ${companyName} สำเร็จครับ 🎉`,
    };
  }

  if (isLostSale) {
    return {
      type: 'text',
      text: `📉 รับทราบครับ\n\nบันทึกว่าปิดการขาย ${companyName} ไม่สำเร็จไว้แล้ว\nไม่เป็นไรครับ สู้ต่อไป! ✌️`,
    };
  }

  const statusText = getStatusText(status);
  return {
    type: 'text',
    text: `✅ บันทึกสถานะเคส ${companyName} (${statusText}) เรียบร้อยครับ`,
  };
}

export function createErrorReplyMessage(errorMessage?: string): TextMessage {
  return {
    type: 'text',
    text: `⚠️ เกิดข้อผิดพลาด${errorMessage ? `\n\n${errorMessage}` : ''}\n\nกรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ`,
  };
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Create postback data string with lead identification
 * UUID only after Supabase migration — no row_id
 * Format: "action=<action>&lead_id=<uuid>"
 */
function createPostbackData(action: string, lead: LeadRow): string {
  const params = new URLSearchParams();
  params.set('action', action);

  if (lead.leadUUID) {
    params.set('lead_id', lead.leadUUID);
  }
  // No row_id — UUID only after Supabase migration
  // If leadUUID is missing, postback will only have action (validator will reject it)

  return params.toString();
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    new: '🆕 รอรับเคส',
    contacted: '📞 โทรหาลูกค้าแล้ว',
    unreachable: '❌ ติดต่อไม่ได้',
    closed: '💰 ปิดการขายสำเร็จ',
    lost: '📉 ปิดไม่สำเร็จ',
  };

  return statusMap[status] || status;
}

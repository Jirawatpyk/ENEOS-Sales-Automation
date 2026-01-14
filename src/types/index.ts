/**
 * ENEOS Sales Automation - Type Definitions
 * Enterprise-grade type safety for all modules
 */

// ===========================================
// Lead & Customer Types
// ===========================================

export interface Lead {
  date: string;
  customerName: string;
  email: string;
  phone: string;
  company: string;
  industryAI: string;
  website: string | null;
  capital: string | null;
  status: LeadStatus;
  salesOwnerId: string | null;
  salesOwnerName: string | null;
  campaignId: string;
  campaignName: string;
  emailSubject: string;
  source: string;
  leadId: string;
  eventId: string;
  clickedAt: string;
  talkingPoint: string | null;
  closedAt: string | null;
  lostAt: string | null;
  unreachableAt: string | null;
  leadSource: string | null;
  jobTitle: string | null;
  city: string | null;
}

export type LeadStatus =
  | 'new'
  | 'claimed'
  | 'contacted'
  | 'closed'
  | 'lost'
  | 'unreachable';

export interface LeadRow extends Lead {
  rowNumber: number;
  version: number;
}

// Valid status values for validation
export const VALID_LEAD_STATUSES: LeadStatus[] = [
  'new',
  'claimed',
  'contacted',
  'closed',
  'lost',
  'unreachable',
];

// ===========================================
// Brevo Webhook Types
// ===========================================

export interface BrevoWebhookPayload {
  event: string;
  email: string;
  id: number;
  date: string;
  ts: number;
  'message-id': string;
  ts_event: number;
  subject: string;
  tag: string;
  sending_ip: string;
  ts_epoch: number;
  contact_id: number;
  campaign_id: number;
  campaign_name: string;
  link?: string;
  // Custom attributes from Brevo
  FIRSTNAME?: string;
  LASTNAME?: string;
  PHONE?: string;
  COMPANY?: string;
  firstname?: string;
  lastname?: string;
  phone?: string;
  company?: string;
}

export interface NormalizedBrevoPayload {
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
  company: string;
  campaignId: string;
  campaignName: string;
  subject: string;
  contactId: string;
  eventId: string;
  clickedAt: string;
  // New fields from Brevo Contact Attributes
  jobTitle: string;
  leadSource: string;
  city: string;
  website: string;
}

// ===========================================
// LINE Types
// ===========================================

export interface LinePostbackData {
  action: LeadStatus;
  rowId: number;
}

export interface LineWebhookEvent {
  type: string;
  replyToken: string;
  source: {
    type: string;
    userId: string;
    groupId?: string;
  };
  timestamp: number;
  postback?: {
    data: string;
  };
  message?: {
    type: string;
    id: string;
    text?: string;
  };
}

export interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

// ===========================================
// Gemini AI Types
// ===========================================

export interface CompanyAnalysis {
  industry: string;
  companyType: string;
  talkingPoint: string;
  website: string | null;
  registeredCapital: string | null;
  keywords: string[];
}

export interface GeminiAnalysisRequest {
  domain: string;
  companyName: string;
}

// ===========================================
// Google Sheets Types
// ===========================================

export interface SheetConfig {
  spreadsheetId: string;
  leadsSheetName: string;
  dedupSheetName: string;
  salesTeamSheetName: string;
}

export interface SalesTeamMember {
  lineUserId: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string; // admin | manager | sales
}

// ===========================================
// API Response Types
// ===========================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: {
    googleSheets: ServiceStatus;
    geminiAI: ServiceStatus;
    lineAPI: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: 'up' | 'down' | 'unknown';
  latency?: number;
  lastChecked?: string;
  error?: string;
}

// ===========================================
// Deduplication Types
// ===========================================

export interface DeduplicationRecord {
  key: string;
  email: string;
  campaignId: string;
  processedAt: string;
}

// ===========================================
// Error Types
// ===========================================

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class DuplicateLeadError extends AppError {
  constructor(email: string, leadSource: string) {
    super(`Lead already processed: ${email} from source ${leadSource}`, 409, 'DUPLICATE_LEAD');
    this.name = 'DuplicateLeadError';
  }
}

export class RaceConditionError extends AppError {
  constructor(message: string) {
    super(message, 409, 'RACE_CONDITION');
    this.name = 'RaceConditionError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.name = 'ExternalServiceError';
  }
}

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
  // UUID Migration fields (for future Supabase migration)
  leadUUID: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  // Contacted timestamp (when sales claimed the lead)
  contactedAt: string | null;
  // Google Search Grounding fields (added 2026-01-26)
  juristicId: string | null;
  dbdSector: string | null;
  province: string | null;
  fullAddress: string | null;
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
// Status History Types
// ===========================================

/**
 * Status History Entry for Google Sheets storage
 * Columns: Lead_UUID, Status, Changed_By_ID, Changed_By_Name, Timestamp, Notes
 * Uses UUID for future Supabase migration compatibility
 */
export interface StatusHistoryEntry {
  leadUUID: string;
  status: LeadStatus;
  changedById: string;
  changedByName: string;
  timestamp: string;
  notes?: string;
}

// ===========================================
// Campaign Contact Types (Story 5-11)
// ===========================================

/**
 * Campaign Contact stored in Campaign_Contacts sheet
 * Populated from Brevo Automation webhook payloads
 */
export interface CampaignContact {
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
  company: string;
  jobTitle: string;
  city: string;
  website: string;
  campaignId: string;
  campaignName: string;
  eventAt: string;
  url: string;
  leadSource: string;
  createdAt: string;
  updatedAt: string;
}

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
  /** @deprecated Use leadId instead. Kept for backward compatibility with existing postbacks */
  rowId?: number;
  /** UUID-based lead identifier for future-proof lead lookup */
  leadId?: string;
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
  industry: string; // Generic category (e.g., "Food & Beverage", "Manufacturing")
  talkingPoint: string;
  website: string | null;
  registeredCapital: string | null;
  keywords: string[];
  // New fields from Google Search grounding
  juristicId: string | null; // เลขทะเบียนนิติบุคคล
  dbdSector: string | null; // DBD Sector code (e.g., F&B-M, MFG-A)
  province: string | null; // จังหวัด (e.g., กรุงเทพมหานคร, เชียงใหม่)
  fullAddress: string | null; // ที่อยู่เต็มของบริษัท (optional)
  // Confidence scoring (Advanced Feature)
  confidence?: number; // 0-100 score indicating classification confidence
  confidenceFactors?: {
    hasRealDomain: boolean; // Domain exists and is valid
    hasDBDData: boolean; // Found official DBD registration
    keywordMatch: boolean; // Matched keyword override rules
    geminiConfident: boolean; // Gemini returned valid DBD sector code
    dataCompleteness: number; // 0-100% of fields populated
  };
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

/**
 * Legacy SalesTeamMember interface (pre-7-4b)
 * Used by methods that always filter for rows WITH lineUserId (getSalesTeamMember, getSalesTeamAll).
 * For Story 7-4b manual members (lineUserId can be null), use SalesTeamMemberFull instead.
 */
export interface SalesTeamMember {
  lineUserId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string; // admin | sales (sales maps to viewer in dashboard)
  createdAt?: string; // ISO 8601 timestamp
  status?: 'active' | 'inactive'; // Team member status for login control
}

/**
 * Extended SalesTeamMember with all fields populated
 * Used by Team Management API (Story 7-4)
 */
export interface SalesTeamMemberFull {
  lineUserId: string | null; // Story 7-4b: Can be null for manually added members
  name: string;
  email: string | null;
  phone: string | null;
  role: 'admin' | 'sales';
  createdAt: string;
  status: 'active' | 'inactive';
}

/**
 * Filter options for getAllSalesTeamMembers
 */
export interface SalesTeamFilter {
  status?: 'active' | 'inactive' | 'all';
  role?: 'admin' | 'sales' | 'all';
}

/**
 * Update payload for updateSalesTeamMember
 */
export interface SalesTeamMemberUpdate {
  email?: string | null;
  phone?: string | null;
  role?: 'admin' | 'sales';
  status?: 'active' | 'inactive';
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
  // Cache metadata (optional)
  cached?: boolean;
  cacheAge?: number;
  refreshed?: boolean;
  error?: string;
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

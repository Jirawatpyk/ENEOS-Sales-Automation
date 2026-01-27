# Changelog

All notable changes to ENEOS Sales Automation will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-01-27

### Added
- **Background Processing with Status Tracking**
  - Asynchronous lead processing to improve webhook response time from 16s → 0.5s (32x faster)
  - New `processLeadAsync()` function for fire-and-forget lead processing
  - Processing Status Service with in-memory tracking (1-hour TTL)
  - Status API endpoints:
    - `GET /api/leads/status/:correlationId` - Public endpoint for checking processing status by UUID
    - `GET /api/leads/status` - Admin-only endpoint for viewing all processing statuses
  - Correlation ID (UUID) returned in webhook response for tracking
  - Status states: `pending` → `processing` → `completed` / `failed`
  - Memory leak prevention with proper timer cleanup
  - Support for concurrent processing with isolation
  - Comprehensive error handling and DLQ integration

- **Status API Documentation**
  - Added Status API endpoints to Swagger/OpenAPI spec
  - Added `ProcessingStatus` schema with full field descriptions
  - Added `AdminAuth` security scheme for authenticated endpoints
  - Added Background Processing flow diagram to ARCHITECTURE.md

- **Test Coverage**
  - 61 new test cases for Background Processing and Status API:
    - `status.controller.test.ts` - 10 tests for controller logic
    - `status.routes.test.ts` - 12 tests for route integration and auth
    - `processing-status.service.test.ts` - 23 tests for status tracking
    - `background-processor.service.test.ts` - 16 tests for async processing

### Changed
- **Webhook Response Pattern**
  - Brevo webhook now responds 200 OK immediately with correlationId
  - Heavy processing (AI, Sheets, LINE) moved to background
  - Changed from synchronous to asynchronous processing pattern

- **Project Structure**
  - Added `background-processor.service.ts` - Async lead processing
  - Added `processing-status.service.ts` - Status tracking with TTL
  - Added `status.controller.ts` - Status API controller
  - Added `status.routes.ts` - Status API routes
  - Updated Service Dependencies diagram in ARCHITECTURE.md

### Performance
- **Response Time**: 16s → 0.5s (32x faster)
- **Throughput**: ~4 req/min → ~120 req/min (40x higher)
- **Cost per Lead**: ~$0.018 → ~$0.005 (70% cheaper)
- **Timeout Risk**: Eliminated (no longer waiting for external APIs)

### Fixed
- Memory leak in Processing Status Service timer cleanup
- Added authentication middleware to admin-only Status API endpoint

---

### Added
- **Google Search Grounding Fields Integration (2026-01-26)**
  - Added 4 new fields from Google Search Grounding API:
    - `juristicId`: เลขทะเบียนนิติบุคคล 13 หลัก (Juristic ID from DBD registration)
    - `dbdSector`: Official business sector classification (e.g., "F&B-M", "MFG-A")
    - `province`: จังหวัด from DBD official data
    - `fullAddress`: Full company address from DBD registration
  - Updated Google Sheets columns to AE-AH (34 total columns)
  - Backend API endpoints now return grounding fields:
    - `GET /api/admin/leads` - List endpoint includes all 4 fields
    - `GET /api/admin/leads/:id` - Detail endpoint includes all 4 fields
  - Frontend displays grounding fields in Lead Detail Sheet:
    - Juristic ID with FileText icon
    - DBD Sector as badge with Briefcase icon
    - Full Address with Home icon
    - Smart fallback: Location shows `province || city` (prioritizes DBD data)
  - Runtime type validation for grounding field data
  - Comprehensive test coverage for new fields

### Changed
- Updated `sheets.service.ts` to read columns A-AH (was A-AD)
- Improved JSDoc documentation for grounding fields
- Standardized null coalescing operator usage (`?? null` instead of `|| null`)

### Fixed
- **Claimed Stats Calculation (2026-01-26)**
  - Fixed Dashboard claimed stats always showing 0
  - Implemented correct logic: claimed = COUNT WHERE Sales_Owner_ID IS NOT NULL
  - Fixed `GET /api/admin/leads?status=claimed` filter to return leads with assigned sales owner
  - Updated `countByStatus()` to count claimed separately from status field
  - Updated `filterByStatus()` to support claimed as special filter parameter
  - Added comprehensive integration tests for claimed filtering
  - Impact: Dashboard now shows accurate claimed lead counts
- Fixed frontend test expecting "City" label (now "Location" with smart fallback)
- Added missing test coverage for grounding fields in API responses

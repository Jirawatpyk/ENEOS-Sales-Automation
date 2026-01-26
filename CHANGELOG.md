# Changelog

All notable changes to ENEOS Sales Automation will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

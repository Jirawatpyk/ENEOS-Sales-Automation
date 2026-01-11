# Admin Dashboard - Epics

> High-level features สำหรับ ENEOS Admin Dashboard

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Admin Dashboard Epics                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   EPIC-00: Backend API (Prerequisite)           ← NEW!          │
│   EPIC-01: Authentication & Authorization                        │
│   EPIC-02: Dashboard Overview                                    │
│   EPIC-03: Sales Team Performance                                │
│   EPIC-04: Lead Management                                       │
│   EPIC-05: Campaign Analytics                                    │
│   EPIC-06: Export & Reports                                      │
│   EPIC-07: System Settings                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## EPIC-00: Backend API (Prerequisite)

### Description
สร้าง API endpoints ใน Backend (eneos-sales-automation) สำหรับให้ Admin Dashboard เรียกใช้ข้อมูล

### Business Value
- Admin Dashboard ต้องการข้อมูลจาก Backend
- API เป็น interface ระหว่าง Frontend และ Google Sheets
- รองรับ Authentication และ Authorization

### Features
| ID | Feature | Priority | Description |
|----|---------|----------|-------------|
| F-00.1 | Admin Auth Middleware | Must Have | ตรวจสอบ Google OAuth token + @eneos.co.th |
| F-00.2 | GET /api/admin/dashboard | Must Have | Dashboard summary & KPIs |
| F-00.3 | GET /api/admin/leads | Must Have | Paginated leads list พร้อม filters |
| F-00.4 | GET /api/admin/leads/:id | Must Have | Single lead detail |
| F-00.5 | GET /api/admin/leads/stats | Should Have | Lead statistics by status/source |
| F-00.6 | GET /api/admin/sales-performance | Must Have | Team performance metrics |
| F-00.7 | GET /api/admin/sales-performance/:userId | Should Have | Individual performance |
| F-00.8 | GET /api/admin/campaigns | Should Have | Campaign analytics |
| F-00.9 | GET /api/admin/campaigns/:id | Could Have | Campaign detail |
| F-00.10 | GET /api/admin/export | Should Have | Export data (Excel/CSV) |

### API Response Format
```typescript
// ทุก endpoint ต้องใช้ format นี้
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### Technical Requirements
```typescript
// Time Units: ทุกค่าเวลาเป็น นาที (minutes)
avgResponseTime: number;  // นาที
avgClosingTime: number;   // นาที
age: number;              // นาที

// Lead Status: 6 ค่าเท่านั้น
type LeadStatus = 'new' | 'claimed' | 'contacted' | 'closed' | 'lost' | 'unreachable';

// Pagination defaults
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
```

### Files to Create
```
eneos-sales-automation/src/
├── controllers/
│   └── admin.controller.ts    ← สร้างใหม่
├── routes/
│   └── admin.routes.ts        ← สร้างใหม่
├── middleware/
│   └── admin-auth.ts          ← สร้างใหม่
├── services/
│   └── sheets.service.ts      ← เพิ่ม methods ใหม่
└── types/
    └── admin.types.ts         ← สร้างใหม่
```

### Acceptance Criteria
- [x] Admin Auth Middleware ตรวจสอบ Google OAuth token ได้
- [x] Middleware ปฏิเสธ email ที่ไม่ใช่ @eneos.co.th
- [x] Dashboard endpoint ส่งกลับ KPIs ครบถ้วน
- [x] Leads endpoint รองรับ pagination, filter, search
- [x] Sales Performance endpoint คำนวณ metrics ถูกต้อง
- [x] ทุก endpoint ใช้ ApiResponse format
- [x] Time values เป็นหน่วยนาที (minutes)
- [x] มี Unit tests สำหรับ endpoints หลัก
- [x] Response time < 2 วินาที

### Dependencies
- Google Sheets API (มีอยู่แล้ว)
- sheets.service.ts (มีอยู่แล้ว)
- google-auth-library (ต้องเพิ่ม)

### Estimated Effort
**5 days**

### Priority
**P0 (Prerequisite)** - ต้องทำก่อน EPIC-01 ถึง EPIC-06

### Status
**DONE** - Completed on 2026-01-12

### Deliverables
#### Files Created:
- `src/routes/admin.routes.ts` - Route definitions for admin endpoints
- `src/controllers/admin.controller.ts` - Request handlers for admin operations
- `src/middleware/admin-auth.ts` - Google OAuth middleware with domain restriction
- `src/types/admin.types.ts` - TypeScript interfaces for admin API
- `src/constants/admin.constants.ts` - Constants for pagination, time units, status values
- `src/validators/admin.validators.ts` - Zod schemas for request validation

#### Test Files Created:
- `src/__tests__/constants/admin.constants.test.ts` (27 tests)
- `src/__tests__/validators/admin.validators.test.ts` (54 tests)
- `src/__tests__/controllers/admin.controller.test.ts` (28 tests)
- `src/__tests__/middleware/admin-auth.test.ts` (13 tests)

#### Test Results:
- **Total Tests**: 423 tests passed
- **TypeScript Errors**: 0 errors
- **Code Coverage**: 75%+ maintained

#### API Endpoints Ready:
- `GET /api/admin/dashboard` - Dashboard summary with KPIs, trends, alerts
- `GET /api/admin/leads` - Paginated leads list with filters (status, owner, dateFrom, dateTo, search)
- `GET /api/admin/leads/:id` - Single lead detail by row number
- `GET /api/admin/sales-performance` - Team performance metrics with conversion rates

---

## EPIC-01: Authentication & Authorization

### Description
ระบบ Login และจัดการสิทธิ์การเข้าถึงสำหรับผู้บริหาร ENEOS

### Business Value
- ปกป้องข้อมูลธุรกิจที่สำคัญ
- จำกัดการเข้าถึงเฉพาะพนักงาน ENEOS
- ติดตามการใช้งานของ Admin

### Features
| ID | Feature | Priority | Description |
|----|---------|----------|-------------|
| F-01.1 | Google OAuth Login | Must Have | Login ด้วย Google Account |
| F-01.2 | Domain Restriction | Must Have | อนุญาตเฉพาะ @eneos.co.th |
| F-01.3 | Session Management | Must Have | จัดการ Session (timeout, refresh) |
| F-01.4 | Logout | Must Have | ออกจากระบบ |
| F-01.5 | Role-based Access | Should Have | แยกสิทธิ์ Admin/Viewer |
| F-01.6 | Audit Log | Could Have | บันทึก Login history |

### Acceptance Criteria
- [ ] ผู้ใช้สามารถ Login ด้วย Google Account ได้
- [ ] ระบบปฏิเสธ email ที่ไม่ใช่ @eneos.co.th
- [ ] Session หมดอายุใน 24 ชั่วโมง
- [ ] มีปุ่ม Logout ที่ทำงานได้

### Dependencies
- Google Cloud Console (OAuth Client ID)
- NextAuth.js configuration

### Estimated Effort
**4 days**

---

## EPIC-02: Dashboard Overview

### Description
หน้า Dashboard หลักที่แสดง KPIs และภาพรวมของระบบ Sales

### Business Value
- ผู้บริหารเห็นภาพรวมได้ทันที
- ติดตาม Performance แบบ Real-time
- ตัดสินใจได้เร็วขึ้น

### Features
| ID | Feature | Priority | Description |
|----|---------|----------|-------------|
| F-02.1 | KPI Cards | Must Have | แสดง Total Leads, Claimed, Contacted, Closed |
| F-02.2 | Lead Trend Chart | Must Have | กราฟแนวโน้ม Lead 30 วัน |
| F-02.3 | Status Distribution | Must Have | Pie chart แสดงสัดส่วน Status |
| F-02.4 | Top Sales Table | Must Have | ตาราง Top 5 Sales |
| F-02.5 | Recent Activity | Should Have | รายการ Activity ล่าสุด |
| F-02.6 | Alerts Panel | Should Have | แจ้งเตือน Lead ไม่มีคนรับ |
| F-02.7 | Date Filter | Should Have | เลือกช่วงเวลา (Today/Week/Month) |
| F-02.8 | Auto Refresh | Could Have | อัปเดตข้อมูลอัตโนมัติทุก 30 วิ |

### Acceptance Criteria
- [ ] KPI Cards แสดงตัวเลขถูกต้องตาม Google Sheets
- [ ] กราฟ Trend แสดงข้อมูล 30 วันย้อนหลัง
- [ ] Top Sales เรียงตาม Conversion Rate
- [ ] Recent Activity แสดง 10 รายการล่าสุด
- [ ] หน้าโหลดไม่เกิน 3 วินาที

### Dependencies
- Backend API: GET /api/admin/dashboard
- Tremor charts library

### Estimated Effort
**5 days**

---

## EPIC-03: Sales Team Performance

### Description
หน้าแสดงผลงานของทีม Sales แต่ละคน

### Business Value
- ประเมินผลงาน Sales ได้
- หา Top Performer และคนที่ต้องพัฒนา
- วางแผน Incentive/Training

### Features
| ID | Feature | Priority | Description |
|----|---------|----------|-------------|
| F-03.1 | Performance Table | Must Have | ตารางแสดง Claimed/Contacted/Closed ของแต่ละคน |
| F-03.2 | Conversion Rate | Must Have | แสดง % Conversion ของแต่ละคน |
| F-03.3 | Performance Bar Chart | Must Have | กราฟเปรียบเทียบผลงาน |
| F-03.4 | Response Time | Should Have | เวลาเฉลี่ยในการรับ Lead |
| F-03.5 | Trend by Person | Should Have | กราฟ Trend รายบุคคล |
| F-03.6 | Period Filter | Should Have | เลือกดู Week/Month/Quarter |
| F-03.7 | Target vs Actual | Could Have | เปรียบเทียบกับเป้าหมาย |
| F-03.8 | Export Individual | Could Have | Export รายงานรายบุคคล |

### Acceptance Criteria
- [ ] แสดงข้อมูล Sales ทุกคนจาก Sales_Team sheet
- [ ] Conversion Rate คำนวณถูกต้อง (Closed/Claimed * 100)
- [ ] Response Time คำนวณจากเวลา Lead เข้า - เวลารับงาน
- [ ] สามารถเรียงลำดับตามคอลัมน์ได้

### Dependencies
- Backend API: GET /api/admin/sales-performance
- Sales_Team sheet structure

### Estimated Effort
**4 days**

---

## EPIC-04: Lead Management

### Description
หน้าแสดงรายการ Lead ทั้งหมด พร้อม Search และ Filter

### Business Value
- ค้นหา Lead ได้รวดเร็ว
- ติดตามสถานะ Lead แต่ละราย
- วิเคราะห์ข้อมูล Lead เชิงลึก

### Features
| ID | Feature | Priority | Description |
|----|---------|----------|-------------|
| F-04.1 | Lead List Table | Must Have | ตารางแสดง Lead ทั้งหมด |
| F-04.2 | Pagination | Must Have | แบ่งหน้า 10/25/50 รายการ |
| F-04.3 | Search | Must Have | ค้นหาด้วย Company/Email/Name |
| F-04.4 | Filter by Status | Must Have | กรองตาม Status |
| F-04.5 | Filter by Owner | Should Have | กรองตาม Sales Owner |
| F-04.6 | Filter by Date | Should Have | กรองตามวันที่ |
| F-04.7 | Sort Columns | Should Have | เรียงตามคอลัมน์ |
| F-04.8 | Lead Detail Modal | Should Have | ดูรายละเอียด Lead |
| F-04.9 | Bulk Select | Could Have | เลือกหลายรายการ |
| F-04.10 | Quick Export | Could Have | Export รายการที่เลือก |

### Acceptance Criteria
- [ ] แสดง Lead ทั้งหมดจาก Leads sheet
- [ ] Search ทำงานแบบ Real-time (debounce 300ms)
- [ ] Filter หลายตัวทำงานร่วมกันได้
- [ ] Pagination ทำงานถูกต้อง
- [ ] Lead Detail แสดงข้อมูลครบทุก field

### Dependencies
- Backend API: GET /api/admin/leads
- Backend API: GET /api/admin/leads/:id
- TanStack Table library

### Estimated Effort
**4 days**

---

## EPIC-05: Campaign Analytics

### Description
หน้าวิเคราะห์ประสิทธิภาพของ Email Campaign

### Business Value
- วัดผล ROI ของแต่ละ Campaign
- หา Campaign ที่ทำงานได้ดี
- ปรับปรุง Campaign ในอนาคต

### Features
| ID | Feature | Priority | Description |
|----|---------|----------|-------------|
| F-05.1 | Campaign Summary Cards | Must Have | สรุป Total Campaigns, Leads, Closed |
| F-05.2 | Campaign Table | Must Have | ตารางแสดงผลแต่ละ Campaign |
| F-05.3 | Conversion by Campaign | Must Have | % Conversion ของแต่ละ Campaign |
| F-05.4 | Leads by Campaign Pie | Should Have | Pie chart สัดส่วน Lead |
| F-05.5 | Campaign Comparison | Should Have | เปรียบเทียบ Campaign |
| F-05.6 | Revenue Estimation | Could Have | ประมาณการรายได้ |
| F-05.7 | Campaign Detail | Could Have | รายละเอียด Campaign |
| F-05.8 | Period Comparison | Could Have | เปรียบเทียบ Quarter/Year |

### Acceptance Criteria
- [ ] แสดงข้อมูล Campaign ทั้งหมดจาก Leads sheet
- [ ] Campaign ID และ Name แสดงถูกต้อง
- [ ] Conversion Rate คำนวณถูกต้อง
- [ ] กราฟแสดงข้อมูลตรงกับตาราง

### Dependencies
- Backend API: GET /api/admin/campaigns
- Campaign data จาก Leads sheet

### Estimated Effort
**4 days**

---

## EPIC-06: Export & Reports

### Description
ระบบ Export ข้อมูลและสร้างรายงาน

### Business Value
- นำข้อมูลไปใช้ในการประชุม
- แชร์รายงานกับผู้บริหารคนอื่น
- เก็บบันทึกผลงานรายเดือน

### Features
| ID | Feature | Priority | Description |
|----|---------|----------|-------------|
| F-06.1 | Export to Excel | Must Have | Download เป็น .xlsx |
| F-06.2 | Export to PDF | Must Have | Download เป็น .pdf |
| F-06.3 | Quick Reports | Should Have | Daily/Weekly/Monthly summary |
| F-06.4 | Custom Date Range | Should Have | เลือกช่วงวันที่ |
| F-06.5 | Select Data Fields | Should Have | เลือก fields ที่ต้องการ |
| F-06.6 | Export History | Could Have | ประวัติการ Export |
| F-06.7 | Scheduled Reports | Could Have | ส่งรายงานอัตโนมัติ |
| F-06.8 | Export to CSV | Could Have | Download เป็น .csv |

### Acceptance Criteria
- [ ] Excel export มีข้อมูลครบถ้วน
- [ ] PDF มี Layout สวยงาม พร้อมใช้งาน
- [ ] File ดาวน์โหลดได้ภายใน 5 วินาที
- [ ] รองรับข้อมูลมากถึง 10,000 rows

### Dependencies
- xlsx library (Excel)
- jsPDF library (PDF)
- Backend API: GET /api/admin/export

### Estimated Effort
**4 days**

---

## EPIC-07: System Settings

### Description
การตั้งค่าระบบและการจัดการ

### Business Value
- ปรับแต่งระบบตามความต้องการ
- จัดการผู้ใช้งาน
- Monitor ระบบ

### Features
| ID | Feature | Priority | Description |
|----|---------|----------|-------------|
| F-07.1 | User Profile | Must Have | แสดงข้อมูลผู้ใช้ที่ Login |
| F-07.2 | Theme Toggle | Could Have | Light/Dark mode |
| F-07.3 | Notification Settings | Could Have | ตั้งค่าการแจ้งเตือน |
| F-07.4 | Admin User Management | Could Have | จัดการ Admin users |
| F-07.5 | System Health | Could Have | แสดงสถานะระบบ |
| F-07.6 | Audit Logs | Could Have | ประวัติการใช้งาน |

### Acceptance Criteria
- [ ] แสดงชื่อและ email ของผู้ใช้
- [ ] Theme toggle ทำงานได้ (ถ้ามี)
- [ ] Settings บันทึกใน localStorage

### Dependencies
- NextAuth.js session
- Local storage

### Estimated Effort
**2 days**

---

## Epic Summary

| Epic | Priority | Effort | Status | Completion Date |
|------|----------|--------|--------|-----------------|
| EPIC-00: Backend API | P0 (Prerequisite) | 5 days | ✅ **DONE** | 2026-01-12 |
| EPIC-01: Authentication | P0 | 4 days | Not Started | - |
| EPIC-02: Dashboard Overview | P0 | 5 days | Not Started | - |
| EPIC-03: Sales Performance | P1 | 4 days | Not Started | - |
| EPIC-04: Lead Management | P1 | 4 days | Not Started | - |
| EPIC-05: Campaign Analytics | P2 | 4 days | Not Started | - |
| EPIC-06: Export & Reports | P2 | 4 days | Not Started | - |
| EPIC-07: System Settings | P3 | 2 days | Not Started | - |
| **Total** | | **32 days** | **1/8 Complete (12.5%)** | |

---

## Release Plan

### Phase 0: Backend API (Prerequisite) - 5 days ✅ **DONE**
- EPIC-00: Backend API
  - ✅ Admin Auth Middleware (Google OAuth + @eneos.co.th validation)
  - ✅ Dashboard endpoint (KPIs, trends, alerts)
  - ✅ Leads endpoints (list, detail, with pagination & filters)
  - ✅ Sales Performance endpoint (team metrics)
  - ✅ 122 unit tests added (423 total tests passing)
  - ✅ TypeScript strict mode compliant (0 errors)

### MVP (Phase 1) - 13 days
- EPIC-01: Authentication
- EPIC-02: Dashboard Overview
- EPIC-04: Lead Management (basic)

### Phase 2 - 8 days
- EPIC-03: Sales Performance
- EPIC-05: Campaign Analytics

### Phase 3 - 6 days
- EPIC-06: Export & Reports
- EPIC-07: System Settings

### Total Timeline: 32 days

---

## Dependencies Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dependencies Flow                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   EPIC-00 (Backend API)  ← Prerequisite (ทำก่อน!)               │
│       │                                                          │
│       ▼                                                          │
│   EPIC-01 (Auth)                                                │
│       │                                                          │
│       ▼                                                          │
│   ┌───────────────────────────────────────────────────────┐     │
│   │                                                       │     │
│   │   EPIC-02        EPIC-03        EPIC-04        EPIC-05│     │
│   │   (Dashboard)    (Sales)        (Leads)       (Campaign)│    │
│   │       │              │              │              │    │    │
│   │       └──────────────┴──────────────┴──────────────┘    │    │
│   │                          │                              │    │
│   │                          ▼                              │    │
│   │                     EPIC-06                             │    │
│   │                    (Export)                             │    │
│   │                                                         │    │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│                         EPIC-07                                  │
│                        (Settings)                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Google OAuth setup ซับซ้อน | Medium | Low | มี documentation ครบ |
| Data มากทำให้ช้า | High | Medium | Pagination, Caching |
| Charts ไม่ตรงความต้องการ | Medium | Low | ใช้ Tremor ที่ flexible |
| Export ข้อมูลเยอะช้า | Medium | Medium | Background job, streaming |

---

## Responsive Design Requirements

> ทุก Epic ต้องรองรับการแสดงผลบน Desktop และ Tablet

| Breakpoint | Width | Support Level |
|------------|-------|---------------|
| Desktop (Primary) | ≥1024px | Full features |
| Tablet | 768px - 1023px | Full features, adjusted layout |
| Mobile | <768px | Basic view (optional) |

### Responsive Considerations per Epic

| Epic | Desktop | Tablet | Mobile |
|------|---------|--------|--------|
| EPIC-01 (Auth) | Full | Full | Full |
| EPIC-02 (Dashboard) | 4 KPI cards in row | 2 per row | 1 per row |
| EPIC-03 (Sales) | Full table | Scrollable table | Card view |
| EPIC-04 (Leads) | Full table + filters | Collapsible filters | Card view |
| EPIC-05 (Campaigns) | Side-by-side charts | Stacked charts | Stacked charts |
| EPIC-06 (Export) | Full form | Full form | Full form |
| EPIC-07 (Settings) | Sidebar + content | Full width | Full width |

### Global Responsive Rules
- Sidebar: Visible on lg+, hamburger menu on md-
- Tables: Horizontal scroll on tablet/mobile
- Modals: Full screen on mobile
- Touch targets: Minimum 44x44px
- Font sizes: Responsive (text-sm on mobile, text-base on desktop)

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Page Load Time | < 3 seconds |
| Time to find a lead | < 10 seconds |
| Export completion | < 5 seconds (1000 rows) |
| User satisfaction | > 4/5 stars |
| Daily active users | > 80% of admins |
| Mobile/Tablet usability | Functional on 768px+ |

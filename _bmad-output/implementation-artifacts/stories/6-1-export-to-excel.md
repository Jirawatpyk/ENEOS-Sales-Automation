# Story 6.1: Export to Excel

Status: ready-for-dev

## Story

As an **ENEOS manager**,
I want **to export lead data to an Excel file with filtering and customization options**,
so that **I can share comprehensive reports with stakeholders, analyze data offline, or present lead information in meetings**.

## Context

### Backend Export Endpoint (Already Implemented)

The backend API already provides a comprehensive export endpoint at `GET /api/admin/export`:

**File:** `src/controllers/admin/export.controller.ts`

**Supported Formats:**
- Excel (`.xlsx`) - Full formatting with bold headers and auto-width columns
- CSV (`.csv`) - UTF-8 encoding
- PDF (`.pdf`) - Formatted for printing with page breaks

**Current Export Columns (16 total):**
Row, Date, Customer Name, Email, Phone, Company, Industry, Website, Capital, Status, Sales Owner, Campaign, Source, Talking Point, Clicked At, Closed At

**Query Parameters:**
```typescript
{
  type: 'leads' | 'all',          // Default: 'leads'
  format: 'xlsx' | 'csv' | 'pdf', // Default: 'xlsx'
  startDate?: string,             // YYYY-MM-DD
  endDate?: string,               // YYYY-MM-DD
  status?: string,                // Filter by status
  owner?: string,                 // LINE User ID
  campaign?: string,              // Campaign ID
}
```

**Features:**
- Max 10,000 rows (configurable via `EXPORT.MAX_ROWS`)
- PDF preview limited to 100 rows (configurable via `EXPORT.PDF_MAX_PREVIEW_ROWS`)
- Automatic date formatting in filename: `leads_export_2026-01-26.xlsx`
- Server-side filtering by date, status, owner, campaign

### Frontend Implementation Strategy

This story focuses on building a **comprehensive Export UI** in the Admin Dashboard that leverages the existing backend endpoint:

1. **Standalone Export Page** (`/export`) - Main export interface with filters
2. **Quick Export Actions** - Export buttons in Dashboard and Leads pages
3. **Next.js API Route Proxy** - Handles authentication and file streaming
4. **Filter Integration** - Reuse existing filter components from Lead Management

### Differences from Quick Export (Story 4-10)

| Feature | Story 4-10 (Quick Export) | Story 6-1 (Export Page) |
|---------|---------------------------|-------------------------|
| Location | Lead Management page | Standalone `/export` page |
| Scope | Selected leads only (client-side) | All leads with filters (server-side) |
| Columns | 16 columns (fixed) | 16+ columns (expandable UI) |
| Filters | Current page filters only | Full filter UI with date range |
| Max Rows | Limited by browser memory | 10,000 rows (backend limit) |
| Formats | Excel, CSV | Excel, CSV, PDF |
| Use Case | Quick share for meetings | Comprehensive reports for analysis |

### Architecture Notes

```
Frontend (Next.js)
    ↓
/app/api/admin/export/route.ts (API Route Proxy)
    ↓
Backend Express API (/api/admin/export)
    ↓
Google Sheets (Data Source)
```

**Why API Route Proxy?**
- Handle NextAuth session validation
- Stream large files without buffering in browser
- Add security headers (Content-Type, Content-Disposition)
- Transform query params if needed (frontend → backend format)

## Acceptance Criteria

1. **AC1: Export Page Navigation**
   - Given I am logged in as an admin
   - When I click "Export & Reports" in the sidebar
   - Then I navigate to `/export` page
   - And the page title is "Export & Reports"
   - And I see the export form with filter options

2. **AC2: Filter Options UI**
   - Given I am on the Export page
   - When the page loads
   - Then I see filter inputs for:
     - Date Range (Start Date, End Date) - date pickers
     - Status (multiselect: new, claimed, contacted, closed, lost, unreachable)
     - Sales Owner (dropdown with team members)
     - Campaign (dropdown with campaigns)
   - And all filters are optional (no validation errors if empty)
   - And filters default to "All" (no filters applied)

3. **AC3: Format Selection**
   - Given I am on the Export page
   - When I view the export form
   - Then I see format options: Excel (.xlsx), CSV (.csv), PDF (.pdf)
   - And Excel is selected by default
   - And each format shows an icon (FileSpreadsheet for Excel, FileText for CSV, FileType for PDF)
   - And formats are displayed as radio buttons or segmented control

4. **AC4: Export Button - Excel**
   - Given I have selected filters and Excel format
   - When I click "Export to Excel" button
   - Then the button shows a loading spinner
   - And the button text changes to "Exporting..."
   - And the button is disabled during export
   - And after 2-5 seconds, the file downloads automatically
   - And a success toast shows "Exported X leads to Excel"
   - And the filename follows pattern: `leads_export_2026-01-26.xlsx`

5. **AC5: Export Button - CSV**
   - Given I have selected CSV format
   - When I click "Export to CSV" button
   - Then the same loading behavior as AC4 occurs
   - And the file downloads with `.csv` extension
   - And CSV uses UTF-8 encoding with BOM
   - And toast shows "Exported X leads to CSV"

6. **AC6: Export Button - PDF**
   - Given I have selected PDF format
   - When I click "Export to PDF" button
   - Then the same loading behavior as AC4 occurs
   - And the file downloads with `.pdf` extension
   - And PDF has formatted header and footer
   - And toast shows "Exported X leads to PDF (Preview: 100 rows)"
   - And if total rows > 100, show note: "Full data in Excel/CSV"

7. **AC7: Filter Application**
   - Given I set filters: Date Range (2026-01-01 to 2026-01-31), Status (contacted, closed)
   - When I click Export
   - Then only leads matching filters are exported
   - And the export count in toast matches filtered count
   - And the backend receives correct query params: `?startDate=2026-01-01&endDate=2026-01-31&status=contacted,closed`

8. **AC8: Empty Results Handling**
   - Given I set filters that match 0 leads
   - When I click Export
   - Then I see an error toast: "No leads match your filters"
   - And no file is downloaded
   - And the button returns to normal state

9. **AC9: Export History Card (Optional - Could Have)**
   - Given I have exported files before
   - When I view the Export page
   - Then I see a "Recent Exports" card below the form
   - And it shows the last 5 exports with: filename, date, row count, format
   - And each entry has a "Download Again" button (if file still cached)
   - Note: This requires backend support (deferred to Story 6-6)

10. **AC10: Max Rows Warning**
    - Given I apply filters that match > 10,000 leads
    - When I click Export
    - Then I see a warning dialog: "Export limited to 10,000 rows. Refine filters?"
    - And I can proceed or cancel
    - And if I proceed, export the first 10,000 rows
    - And toast shows "Exported 10,000 leads (limit reached)"

11. **AC11: API Route Proxy Implementation**
    - Given the frontend calls `/api/admin/export`
    - When the API route receives the request
    - Then it validates NextAuth session
    - And forwards request to backend: `${BACKEND_URL}/api/admin/export?${params}`
    - And streams the response back to browser
    - And sets headers: `Content-Type`, `Content-Disposition`
    - And handles errors with proper HTTP status codes

12. **AC12: Error Handling**
    - Given the backend API fails (500 error)
    - When I click Export
    - Then I see an error toast: "Export failed. Please try again."
    - And the button returns to normal state
    - And the error is logged to console
    - And I can retry the export

13. **AC13: Accessibility**
    - Given I use keyboard or screen reader
    - When interacting with the Export page
    - Then all form inputs are keyboard accessible (Tab navigation)
    - And date pickers support keyboard input (type dates)
    - And export button has `aria-label="Export leads to {format}"`
    - And loading state is announced to screen readers
    - And error/success toasts are announced

14. **AC14: Responsive Design**
    - Given I view the Export page on different screen sizes
    - When the page renders
    - Then on Desktop (≥1024px): Form fields in 2 columns, wide export button
    - And on Tablet (768px-1023px): Form fields in 1 column, full-width button
    - And on Mobile (<768px): Same as tablet, date pickers optimized for touch
    - And all filters remain functional across breakpoints

15. **AC15: Dashboard Quick Export Link**
    - Given I am on the Dashboard page (`/`)
    - When I scroll to the Recent Activity section
    - Then I see a "Export Leads" button in the section header
    - And clicking it navigates to `/export` page with today's date filters pre-filled

16. **AC16: Leads Page Quick Export Link**
    - Given I am on the Leads page (`/leads`)
    - When I view the page toolbar
    - Then I see an "Export" button next to the search bar
    - And clicking it navigates to `/export` page with current page filters applied
    - And filters include: search query, status, owner, campaign, date range

## Tasks / Subtasks

- [ ] **Task 1: Create Export Page Route** (AC: #1)
  - [ ] 1.1 Create `app/export/page.tsx`
  - [ ] 1.2 Add page title and metadata: "Export & Reports - ENEOS Admin"
  - [ ] 1.3 Protect page with `requireAuth` or NextAuth middleware
  - [ ] 1.4 Create page layout with header and form container
  - [ ] 1.5 Add sidebar navigation link: "Export & Reports" with FileDown icon

- [ ] **Task 2: Build Export Form UI** (AC: #2, #3)
  - [ ] 2.1 Create `components/export/ExportForm.tsx` component
  - [ ] 2.2 Add Date Range inputs (Start Date, End Date) using Shadcn date-picker
  - [ ] 2.3 Add Status multiselect using Shadcn multiselect or checkbox group
  - [ ] 2.4 Add Sales Owner dropdown - fetch from `/api/admin/sales-performance`
  - [ ] 2.5 Add Campaign dropdown - fetch from `/api/admin/campaigns`
  - [ ] 2.6 Add Format selector (radio buttons): Excel (default), CSV, PDF
  - [ ] 2.7 Style form with Tremor Card and Grid layout
  - [ ] 2.8 Implement form state management with React useState or react-hook-form

- [ ] **Task 3: Implement Export Button Logic** (AC: #4, #5, #6)
  - [ ] 3.1 Create `hooks/use-export-data.ts` hook
  - [ ] 3.2 Manage `isExporting` loading state
  - [ ] 3.3 Build query params from filter state: `buildExportParams(filters)`
  - [ ] 3.4 Call `/api/admin/export?{params}` via fetch
  - [ ] 3.5 Handle file download: `Content-Disposition: attachment` triggers browser download
  - [ ] 3.6 Show loading spinner on button during export
  - [ ] 3.7 Show success toast with row count after download
  - [ ] 3.8 Handle different formats (xlsx, csv, pdf) with same logic

- [ ] **Task 4: Create Next.js API Route Proxy** (AC: #11)
  - [ ] 4.1 Create `app/api/admin/export/route.ts`
  - [ ] 4.2 Validate NextAuth session: `const session = await getServerSession(authOptions)`
  - [ ] 4.3 Check user domain: `session.user.email.endsWith('@eneos.co.th')`
  - [ ] 4.4 Build backend URL: `${process.env.BACKEND_URL}/api/admin/export?${searchParams}`
  - [ ] 4.5 Forward request to backend with `fetch(backendUrl)`
  - [ ] 4.6 Stream response back to client: `return new Response(response.body)`
  - [ ] 4.7 Set headers: `Content-Type`, `Content-Disposition` (from backend)
  - [ ] 4.8 Handle errors: Return 500 with JSON error message

- [ ] **Task 5: Filter Application Logic** (AC: #7)
  - [ ] 5.1 Implement `buildExportParams(filters)` helper function
  - [ ] 5.2 Transform date inputs to YYYY-MM-DD format
  - [ ] 5.3 Join multiple statuses with comma: `status=contacted,closed`
  - [ ] 5.4 Map owner/campaign to IDs (not names)
  - [ ] 5.5 Add type=leads (default) and format param
  - [ ] 5.6 Create URLSearchParams object and return string

- [ ] **Task 6: Error Handling** (AC: #8, #10, #12)
  - [ ] 6.1 Handle 404 (no results): Show toast "No leads match your filters"
  - [ ] 6.2 Handle 413 (too many rows): Show warning dialog with limit message
  - [ ] 6.3 Handle 500 (server error): Show toast "Export failed. Please try again."
  - [ ] 6.4 Handle network errors: Show toast "Network error. Check connection."
  - [ ] 6.5 Log all errors to console for debugging
  - [ ] 6.6 Implement retry logic for transient errors (optional)

- [ ] **Task 7: Dashboard Quick Export Link** (AC: #15)
  - [ ] 7.1 Edit `app/page.tsx` (Dashboard)
  - [ ] 7.2 Add "Export Leads" button to Recent Activity section header
  - [ ] 7.3 Use Link component: `href="/export?startDate={today}&endDate={today}"`
  - [ ] 7.4 Pre-fill today's date in export page filters
  - [ ] 7.5 Style button with Tremor Button and FileDown icon

- [ ] **Task 8: Leads Page Quick Export Link** (AC: #16)
  - [ ] 8.1 Edit `app/leads/page.tsx`
  - [ ] 8.2 Add "Export" button to page toolbar (next to search bar)
  - [ ] 8.3 Read current filters from URL params or state
  - [ ] 8.4 Navigate to `/export?{currentFilters}` on click
  - [ ] 8.5 Export page reads params and applies filters automatically

- [ ] **Task 9: Accessibility Implementation** (AC: #13)
  - [ ] 9.1 Add `aria-label` to all form inputs
  - [ ] 9.2 Add `aria-label="Export leads to {format}"` to export button
  - [ ] 9.3 Test keyboard navigation (Tab, Enter, Escape)
  - [ ] 9.4 Add `role="status"` to loading spinner
  - [ ] 9.5 Ensure date pickers support keyboard input
  - [ ] 9.6 Test with screen reader (NVDA or VoiceOver)

- [ ] **Task 10: Responsive Design** (AC: #14)
  - [ ] 10.1 Use Tremor Grid: `numItemsSm={1} numItemsLg={2}` for form fields
  - [ ] 10.2 Make export button full-width on mobile: `w-full md:w-auto`
  - [ ] 10.3 Test on Desktop (1920px), Tablet (768px), Mobile (375px)
  - [ ] 10.4 Optimize date pickers for touch: larger touch targets
  - [ ] 10.5 Ensure dropdowns remain functional on small screens

- [ ] **Task 11: TypeScript Types** (Technical)
  - [ ] 11.1 Create `types/export.types.ts`
  - [ ] 11.2 Define `ExportFilters` interface (dates, status, owner, campaign)
  - [ ] 11.3 Define `ExportFormat` type: 'xlsx' | 'csv' | 'pdf'
  - [ ] 11.4 Define `ExportParams` interface (query params for API)
  - [ ] 11.5 Import types in components and hooks

- [ ] **Task 12: Testing** (Technical)
  - [ ] 12.1 Unit test `buildExportParams()` helper function
  - [ ] 12.2 Unit test `use-export-data` hook with mock fetch
  - [ ] 12.3 Integration test: API route proxy with mock backend
  - [ ] 12.4 E2E test: Full export flow (filters → export → download)
  - [ ] 12.5 Test error scenarios (no results, server error, network error)
  - [ ] 12.6 Test max rows warning (>10,000 leads)

- [ ] **Task 13: Documentation** (Technical)
  - [ ] 13.1 Update `docs/admin-dashboard/features.md` with Export page details
  - [ ] 13.2 Add JSDoc comments to `use-export-data` hook
  - [ ] 13.3 Document API route proxy in `docs/api/frontend-api-routes.md`
  - [ ] 13.4 Add screenshots to `docs/screenshots/export-page.png`
  - [ ] 13.5 Update user guide: "How to export leads"

## Technical Notes

### Libraries & Dependencies

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "next-auth": "^4.24.0",
    "@tremor/react": "^3.x",
    "date-fns": "^3.x"
  },
  "devDependencies": {
    "@types/node": "20.x",
    "typescript": "5.x"
  }
}
```

**Note:** XLSX library (`xlsx`) is NOT needed in frontend. The backend already handles file generation. Frontend only triggers download via API route.

### File Structure

```
app/
├── export/
│   └── page.tsx                    # Main export page
├── api/
│   └── admin/
│       └── export/
│           └── route.ts            # API route proxy
components/
├── export/
│   ├── ExportForm.tsx              # Form component
│   ├── ExportButton.tsx            # Export button with loading state
│   └── FormatSelector.tsx          # Radio buttons for format
hooks/
└── use-export-data.ts              # Export logic hook
types/
└── export.types.ts                 # TypeScript interfaces
lib/
└── export-helpers.ts               # buildExportParams() utility
```

### Backend API Contract

**Endpoint:** `GET /api/admin/export`

**Query Parameters:**
```typescript
interface ExportQueryParams {
  type?: 'leads' | 'all';          // Default: 'leads'
  format?: 'xlsx' | 'csv' | 'pdf'; // Default: 'xlsx'
  startDate?: string;              // YYYY-MM-DD
  endDate?: string;                // YYYY-MM-DD
  status?: string;                 // Comma-separated: 'new,contacted'
  owner?: string;                  // LINE User ID
  campaign?: string;               // Campaign ID
}
```

**Response:**
- Status 200: File stream (Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)
- Status 400: Validation error (JSON)
- Status 500: Server error (JSON)

**Headers:**
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="leads_export_2026-01-26.xlsx"
```

### API Route Proxy Example

```typescript
// app/api/admin/export/route.ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  // 1. Validate session
  const session = await getServerSession(authOptions);
  if (!session || !session.user.email.endsWith('@eneos.co.th')) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Build backend URL
  const { searchParams } = new URL(request.url);
  const backendUrl = `${process.env.BACKEND_URL}/api/admin/export?${searchParams}`;

  try {
    // 3. Forward to backend
    const response = await fetch(backendUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.statusText}`);
    }

    // 4. Stream response back
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': response.headers.get('Content-Disposition') || 'attachment',
      },
    });
  } catch (error) {
    console.error('Export API route error:', error);
    return new Response(JSON.stringify({ error: 'Export failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

### Filter State Management

```typescript
// Example filter state
interface ExportFilters {
  startDate: string | null;     // "2026-01-01"
  endDate: string | null;       // "2026-01-31"
  status: string[];             // ["contacted", "closed"]
  owner: string | null;         // "U123abc"
  campaign: string | null;      // "CAMP-001"
  format: 'xlsx' | 'csv' | 'pdf'; // "xlsx"
}

// Convert to URL params
function buildExportParams(filters: ExportFilters): string {
  const params = new URLSearchParams();

  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  if (filters.status.length > 0) params.set('status', filters.status.join(','));
  if (filters.owner) params.set('owner', filters.owner);
  if (filters.campaign) params.set('campaign', filters.campaign);

  params.set('type', 'leads');
  params.set('format', filters.format);

  return params.toString();
}
```

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Export completion time | < 5 seconds | Time from click to download |
| Filter application accuracy | 100% | Exported data matches filters |
| Error rate | < 1% | Failed exports / total exports |
| User satisfaction | > 4/5 stars | Post-implementation survey |
| Accessibility score | 100% | Lighthouse audit |

## Dependencies

### Required (Must Complete First)
- ✅ **Story 0-10: Export Endpoint** - Backend API already implemented
- ✅ **Story 1-1: Google OAuth Login** - Authentication for API route
- ✅ **Story 4-5: Filter by Owner** - Reuse owner dropdown component
- ✅ **Story 4-6: Filter by Date** - Reuse date range picker component

### Optional (Nice to Have)
- **Story 6-6: Export History** - Track export activity (deferred)
- **Story 6-5: Select Data Fields** - Choose columns to export (future enhancement)

## Definition of Done

- [ ] All 16 Acceptance Criteria pass
- [ ] All 13 Tasks completed
- [ ] TypeScript compiles with 0 errors (`npm run typecheck`)
- [ ] Linter passes with 0 warnings (`npm run lint`)
- [ ] Unit tests pass (>80% coverage for new code)
- [ ] Integration tests pass (API route proxy)
- [ ] E2E test passes (export flow)
- [ ] Manual testing on Desktop, Tablet, Mobile
- [ ] Accessibility audit passes (Lighthouse score 100)
- [ ] Code review approved by Rex (Code Reviewer)
- [ ] Documentation updated (features.md, screenshots)
- [ ] Sprint status updated: `6-1-export-to-excel: done`

## Research References

### XLSX Integration
- [SheetJS NextJS Integration](https://docs.sheetjs.com/docs/demos/static/nextjs/)
- [How to Export Data into Excel in Next JS 14](https://emdiya.medium.com/how-to-export-data-into-excel-in-next-js-14-820edf8eae6a)
- [Download xlsx Files from Next.js Route Handler](https://www.davegray.codes/posts/how-to-download-xlsx-files-from-a-nextjs-route-handler)

### React Admin Dashboard Patterns
- [React-Admin Framework](https://github.com/marmelab/react-admin)
- [TailAdmin React Dashboard](https://tailadmin.com/react)
- [Tokyo Free TypeScript Admin Dashboard](https://github.com/bloomui/tokyo-free-white-react-admin-dashboard)

**Note:** Backend already uses `exceljs` library for XLSX generation. Frontend only needs to trigger download via API route.

---

**Story Created By:** Bob (Scrum Master Agent)
**Created Date:** 2026-01-26
**Epic:** 6 - Export & Reports
**Story Points:** 8 (Large - Multiple components, API route, testing)
**Estimated Effort:** 3-4 days

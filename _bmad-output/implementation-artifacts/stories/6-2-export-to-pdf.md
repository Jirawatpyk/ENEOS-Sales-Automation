# Story 6.2: Export to PDF

Status: done

## Story

As an **ENEOS manager**,
I want **to preview and print PDF exports before downloading**,
so that **I can verify the content is correct and print physical copies directly from the browser**.

## Project Context

> **IMPORTANT:** This is a **Frontend story** for the Admin Dashboard project.
>
> **Target Project:** `eneos-admin-dashboard/` (Next.js)
> **NOT:** `eneos-sales-automation/` (Express Backend)

## Existing Code to Extend

The following files **already exist** and must be extended (NOT recreated):

| File | Location | What It Does |
|------|----------|--------------|
| `export-form.tsx` | `src/components/export/` | Form with format selector (xlsx/csv/pdf), date range, filters |
| `use-export.ts` | `src/hooks/` | Export hook with blob download, toast, error handling |
| `date-range-picker.tsx` | `src/components/ui/` | Date picker component |
| `radio-group.tsx` | `src/components/ui/` | Format selector radio buttons |

**Key Patterns Already Established:**
```typescript
// Blob download pattern (use-export.ts line 79-87)
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = filename;
link.click();
window.URL.revokeObjectURL(url); // IMPORTANT: cleanup
```

## File Modification List

```
MODIFY: src/hooks/use-export.ts
  - Add previewPdf() function returning blob
  - Add AbortController support

MODIFY: src/components/export/export-form.tsx
  - Add "Preview PDF" button (visible when format=pdf)
  - Add PDF row limit warning banner

CREATE: src/components/export/pdf-preview-modal.tsx
  - PDF viewer using react-pdf
  - Page navigation, zoom controls
  - Download and Print buttons

CREATE: src/components/export/pdf-viewer.tsx
  - Wrapper for react-pdf Document/Page
  - Loading skeleton, error states
```

## Acceptance Criteria

### Core Features (Must Implement)

1. **AC1: Preview PDF Button**
   - Given I am on the Export page with PDF format selected
   - When I view the export form
   - Then I see a "Preview PDF" button next to "Export" button
   - And the button is only visible when PDF format is selected

2. **AC2: PDF Preview Modal**
   - Given I click "Preview PDF" button
   - When the PDF loads successfully
   - Then a modal opens with embedded PDF viewer
   - And I can scroll through pages
   - And I can zoom in/out (75%, 100%, 125%, fit width)
   - And I see page indicator (e.g., "Page 2 of 5")

3. **AC3: Print from Preview**
   - Given I am viewing PDF in preview modal
   - When I click "Print" button
   - Then browser print dialog opens with PDF content
   - And modal remains open after print dialog closes

4. **AC4: Download from Preview**
   - Given I am viewing PDF in preview modal
   - When I click "Download" button
   - Then the PDF file downloads
   - And filename follows pattern: `leads_export_2026-01-31.pdf`
   - And modal closes after download starts

5. **AC5: PDF Row Limit Warning**
   - Given PDF format is selected
   - When the form renders
   - Then I see info banner: "PDF limited to 100 rows. Use Excel/CSV for complete data."
   - And banner has link to switch format to Excel

6. **AC6: Loading States**
   - Given I click Preview PDF
   - When request is in progress
   - Then button shows spinner and "Loading Preview..."
   - And button is disabled
   - And modal shows skeleton loader until PDF renders

7. **AC7: Error Handling**
   - Given the backend PDF generation fails
   - When I click Preview or Export
   - Then I see error toast: "PDF generation failed. Try Excel/CSV."
   - And button returns to normal state

8. **AC8: Modal Accessibility**
   - Given I use keyboard
   - When interacting with preview modal
   - Then Escape key closes modal
   - And focus is trapped inside modal
   - And Tab navigates through controls

### Deferred Features (Future Stories)

- **PDF Options Panel** (orientation, paper size) - Requires backend changes
- **Filter Summary in PDF Header** - Requires backend enhancement
- **Custom filename with filters** - Backend enhancement

## Tasks / Subtasks

- [x] **Task 1: Extend useExport Hook** (AC: #1, #6, #7)
  - [x] 1.1 Add `previewPdf()` function that returns `{ blob: Blob, filename: string }`
  - [x] 1.2 Add `isPreviewing` loading state separate from `isExporting`
  - [x] 1.3 Add AbortController for cancellation
  - [x] 1.4 Reuse existing error handling and toast patterns

- [x] **Task 2: Create PDF Preview Modal** (AC: #2, #3, #4, #8)
  - [x] 2.1 Create `pdf-preview-modal.tsx` with Dialog from shadcn
  - [x] 2.2 Install react-pdf: `npm install react-pdf` (v10.3.0 for React 19 compat)
  - [x] 2.3 Configure PDF.js worker (see Dev Notes)
  - [x] 2.4 Implement page navigation (prev/next buttons, page indicator)
  - [x] 2.5 Implement zoom controls (dropdown: 75%, 100%, 125%, Fit Width)
  - [x] 2.6 Add Download button using existing blob download pattern
  - [x] 2.7 Add Print button using iframe technique
  - [x] 2.8 Implement focus trap via Radix Dialog (built-in, react-focus-lock incompatible with React 19)
  - [x] 2.9 Add Escape key handler to close modal (via Radix Dialog onOpenChange)

- [x] **Task 3: Update Export Form** (AC: #1, #5)
  - [x] 3.1 Add "Preview PDF" button conditionally shown when `format === 'pdf'`
  - [x] 3.2 Add PDF limit warning banner with info icon and "Switch to Excel" link
  - [x] 3.3 Wire Preview button to open modal with PDF blob

- [x] **Task 4: Testing**
  - [x] 4.1 Unit test useExport.previewPdf() with mock fetch (13 tests)
  - [x] 4.2 Unit test PdfPreviewModal open/close/keyboard/print/download (19 tests)
  - [x] 4.3 Unit test ExportForm PDF preview/warning features (9 tests)
  - [ ] 4.4 E2E test: Select PDF → Preview → Print → Download (deferred - requires running backend)

- [x] **Task 5: Documentation**
  - [x] 5.1 Update story with implementation notes
  - [x] 5.2 Update sprint-status.yaml

## Dev Notes

### react-pdf Setup for Next.js App Router

```bash
npm install react-pdf@^7.7.0
```

**Worker Configuration (CRITICAL for Next.js):**

```tsx
// src/components/export/pdf-viewer.tsx
'use client';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Option 1: CDN (simple but may have CSP issues)
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

// Option 2: Local worker (recommended for production)
// Copy node_modules/pdfjs-dist/build/pdf.worker.min.js to public/
// pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
```

### Print Implementation (Iframe Technique)

```typescript
const handlePrint = () => {
  // Create hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  // Load PDF blob into iframe
  const blobUrl = URL.createObjectURL(pdfBlob);
  iframe.src = blobUrl;

  iframe.onload = () => {
    iframe.contentWindow?.print();
    // Cleanup after print dialog closes
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(blobUrl);
    }, 1000);
  };
};
```

### Extending useExport Hook

Add to existing `src/hooks/use-export.ts`:

```typescript
interface UseExportReturn {
  exportData: (params: ExportParams) => Promise<void>;
  previewPdf: (params: ExportParams) => Promise<{ blob: Blob; filename: string }>;
  isExporting: boolean;
  isPreviewing: boolean;  // NEW
  error: Error | null;
}

const previewPdf = async (params: ExportParams) => {
  setIsPreviewing(true);
  try {
    // Force PDF format
    const response = await fetch(`/api/export?${buildParams({ ...params, format: 'pdf' })}`);
    if (!response.ok) throw new Error('Preview failed');

    const blob = await response.blob();
    const filename = extractFilename(response) || `preview_${Date.now()}.pdf`;

    return { blob, filename };
  } finally {
    setIsPreviewing(false);
  }
};
```

### PDF Preview Modal Structure

```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-4xl h-[90vh]">
    <DialogHeader>
      <DialogTitle>PDF Preview</DialogTitle>
    </DialogHeader>

    {/* Toolbar */}
    <div className="flex items-center justify-between border-b pb-2">
      <div className="flex items-center gap-2">
        <Button onClick={prevPage} disabled={page <= 1}>
          <ChevronLeft />
        </Button>
        <span>Page {page} of {numPages}</span>
        <Button onClick={nextPage} disabled={page >= numPages}>
          <ChevronRight />
        </Button>
      </div>
      <Select value={zoom} onValueChange={setZoom}>
        <SelectItem value="0.75">75%</SelectItem>
        <SelectItem value="1">100%</SelectItem>
        <SelectItem value="1.25">125%</SelectItem>
        <SelectItem value="width">Fit Width</SelectItem>
      </Select>
    </div>

    {/* PDF Viewer */}
    <div className="flex-1 overflow-auto">
      <Document file={pdfBlob} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
        <Page pageNumber={page} scale={zoom === 'width' ? undefined : Number(zoom)} />
      </Document>
    </div>

    {/* Footer Actions */}
    <DialogFooter>
      <Button variant="outline" onClick={handlePrint}>
        <Printer className="mr-2 h-4 w-4" />
        Print
      </Button>
      <Button onClick={handleDownload}>
        <Download className="mr-2 h-4 w-4" />
        Download
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Architecture Compliance

| Requirement | Implementation |
|-------------|----------------|
| State Management | useState for modal, extend useExport hook |
| Component Pattern | Client components with 'use client' |
| Styling | Tailwind CSS + Shadcn Dialog/Button |
| Error Handling | Reuse existing toast pattern |
| Accessibility | react-focus-lock, Escape key, ARIA |

### Testing Standards

- **Unit Tests:** Vitest + React Testing Library
- **Coverage:** 80% for new code
- **E2E:** Playwright for preview → print → download flow

## Dependencies

### NPM Packages to Install

```bash
npm install react-pdf@^10.3.0
```
> **Note:** `react-focus-lock` was originally planned but not installed - Radix Dialog provides built-in focus trap (React 19 compatible).

### Required (Already Done)
- ✅ Story 6-1: Export infrastructure (export-form.tsx, use-export.ts)
- ✅ Backend PDF export endpoint

## Definition of Done

- [x] All 8 Acceptance Criteria pass
- [x] All 5 Tasks completed
- [x] TypeScript compiles with 0 errors (for new code)
- [x] Linter passes with 0 warnings (for new code)
- [x] Unit tests pass - 72 tests (41 dev + 31 TEA guardrail), 3201 total pass
- [ ] E2E test passes (preview → print → download) - Deferred: requires running backend
- [x] Accessibility: Escape closes modal, focus trapped (via Radix Dialog)
- [x] Code review approved by Rex

## References

- [Backend PDF Implementation: src/controllers/admin/export.controller.ts lines 230-406]
- [Backend PDF Limit: EXPORT.PDF_MAX_PREVIEW_ROWS = 100]
- [Existing Export Form: eneos-admin-dashboard/src/components/export/export-form.tsx]
- [Existing Export Hook: eneos-admin-dashboard/src/hooks/use-export.ts]
- [react-pdf docs: https://github.com/wojtekmaj/react-pdf]

---

**Story Created By:** Bob (Scrum Master Agent)
**Created Date:** 2026-01-31
**Epic:** 6 - Export & Reports
**Story Points:** 5 (Medium)
**Estimated Effort:** 2-3 days

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- **Task 1:** Extended `useExport` hook with `previewPdf()`, `isPreviewing`, `cancelPreview()` using AbortController. Refactored shared helpers: `buildQueryParams()`, `extractFilename()`. Error handling shows toast "PDF generation failed. Try Excel/CSV." (AC#7).
- **Task 2:** Created `pdf-preview-modal.tsx` with Radix Dialog, page navigation (prev/next + "Page X of Y" indicator), zoom controls (Select dropdown: 75%/100%/125%/Fit Width), Download button (blob URL + auto-close modal, AC#4), Print button (iframe technique, modal stays open, AC#3). Focus trap + Escape key via Radix Dialog built-in (AC#8). Created `pdf-viewer.tsx` wrapper for react-pdf Document/Page with loading skeleton and error states.
- **Task 2 Deviations:** Used react-pdf v10.3.0 (not 7.7.0) for React 19 compatibility. Used Radix Dialog built-in focus trap instead of react-focus-lock (incompatible with React 19). CSS import paths updated for v10 (`react-pdf/dist/Page/` instead of `react-pdf/dist/esm/Page/`).
- **Task 3:** Added "Preview PDF" button (visible only when format=pdf) with loading spinner. Added PDF row limit warning banner with info icon and "Switch to Excel" link that changes format. Modal integration wired to previewPdf hook result.
- **Task 4:** 41 unit tests total (13 hook + 19 modal + 9 form). Full regression suite: 3171 tests pass, 0 failures. E2E test deferred (requires running backend).
- **Task 5:** Sprint-status updated. Story file updated. Created `dialog.tsx` UI component (standard shadcn/ui pattern). Added `css: true` to vitest.config.ts for react-pdf CSS imports.

### Change Log

- 2026-01-31: Story 6.2 implementation complete (Tasks 1-5, 41 new tests, all 3171 tests pass)
- 2026-01-31: Rex code review fixes applied (9 issues: 2 HIGH, 4 MEDIUM, 3 LOW)
  - H1: PDF.js worker moved from CDN to local `/public/pdf.worker.min.mjs` (CSP + reliability)
  - H2: Print iframe cleanup changed from arbitrary setTimeout to `afterprint` event with fallback + `onerror` handler
  - M1: Added blob cleanup on ExportForm unmount via useEffect
  - M2: Fixed extractFilename regex to exclude semicolons/whitespace in unquoted filenames
  - M3: Fit Width zoom now uses ref-based dynamic container measurement instead of hardcoded 800px
  - M4: Removed duplicate `aria-label` from Select root (kept on SelectTrigger only)
  - L1: handleLoadError now logs error via console.error for debugging
  - L2: Story Dependencies section updated (removed react-focus-lock, corrected react-pdf version)
  - L3: Acknowledged (jsdom limitation for Select interaction testing)
- 2026-01-31: TEA guardrail tests generated (+31 tests, 72 total for Story 6-2, 3201 total pass)
  - 13 hook tests: exportData() download flow, date params, filename extraction, abort suppression
  - 7 component tests: PdfViewer null file, rendering, prop forwarding
  - 11 edge case tests: PdfPreviewModal disabled states, page boundaries, URL cleanup, print behavior
  - Healing: 2 iterations (DOM mock interference → targeted createElement interception)

### File List

**New Files:**
- `eneos-admin-dashboard/src/components/export/pdf-preview-modal.tsx` - PDF preview modal with page navigation, zoom, print, download
- `eneos-admin-dashboard/src/components/export/pdf-viewer.tsx` - react-pdf Document/Page wrapper with loading/error states
- `eneos-admin-dashboard/src/components/ui/dialog.tsx` - Radix Dialog UI component (shadcn pattern)
- `eneos-admin-dashboard/src/__tests__/hooks/use-export.test.tsx` - 13 tests for previewPdf hook
- `eneos-admin-dashboard/src/__tests__/components/pdf-preview-modal.test.tsx` - 19 tests for modal
- `eneos-admin-dashboard/src/__tests__/components/export-form.test.tsx` - 9 tests for form PDF features
- `eneos-admin-dashboard/public/pdf.worker.min.mjs` - Local PDF.js worker (copied from pdfjs-dist)
- `eneos-admin-dashboard/src/__tests__/hooks/use-export-guardrail.test.tsx` - 13 TEA guardrail tests for exportData, params, filename
- `eneos-admin-dashboard/src/__tests__/components/pdf-viewer.test.tsx` - 7 TEA guardrail tests for PdfViewer component
- `eneos-admin-dashboard/src/__tests__/components/pdf-preview-modal-guardrail.test.tsx` - 11 TEA guardrail tests for modal edge cases

**Modified Files:**
- `eneos-admin-dashboard/src/hooks/use-export.ts` - Added previewPdf(), isPreviewing, cancelPreview(), shared helpers; fixed extractFilename regex
- `eneos-admin-dashboard/src/components/export/export-form.tsx` - Added Preview PDF button, PDF limit warning, modal integration; added blob cleanup on unmount
- `eneos-admin-dashboard/vitest.config.ts` - Added `css: true` for react-pdf CSS imports
- `eneos-admin-dashboard/package.json` - Added react-pdf dependency

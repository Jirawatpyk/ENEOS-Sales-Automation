/**
 * Export Controller
 * Handles GET /api/admin/export
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';
import { extractDateKey } from '../../utils/date-formatter.js';
import { EXPORT } from '../../constants/admin.constants.js';
import { exportQuerySchema, safeValidateQuery } from '../../validators/admin.validators.js';
import { getAllLeads, filterByStatus } from './helpers/index.js';

/**
 * GET /api/admin/export
 * Export data to file
 */
export async function exportData(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const validation = safeValidateQuery(exportQuerySchema, req.query);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'พารามิเตอร์ไม่ถูกต้อง',
          details: validation.errors,
        },
      });
      return;
    }

    const { type, format, startDate, endDate, status, owner, campaign, fields } = validation.data;

    logger.info('exportData called', {
      type,
      format,
      user: req.user?.email,
    });

    // ดึงข้อมูลตาม type
    const allLeads = await getAllLeads();
    let dataToExport: Record<string, string | number>[] = [];

    // Apply filters
    let filteredLeads = allLeads;

    // Filter by date range (compare dates in YYYY-MM-DD format to avoid timezone issues)
    if (startDate) {
      filteredLeads = filteredLeads.filter((lead) => extractDateKey(lead.date) >= startDate);
    }

    if (endDate) {
      filteredLeads = filteredLeads.filter((lead) => extractDateKey(lead.date) <= endDate);
    }

    if (status) {
      filteredLeads = filterByStatus(filteredLeads, status);
    }

    if (owner) {
      filteredLeads = filteredLeads.filter((lead) => lead.salesOwnerId === owner);
    }

    if (campaign) {
      filteredLeads = filteredLeads.filter((lead) => lead.campaignId === campaign);
    }

    // Limit to MAX_ROWS
    if (filteredLeads.length > EXPORT.MAX_ROWS) {
      filteredLeads = filteredLeads.slice(0, EXPORT.MAX_ROWS);
    }

    // Prepare data based on type
    if (type === 'leads' || type === 'all') {
      dataToExport = filteredLeads.map((lead) => ({
        'Row': lead.rowNumber,
        'Company': lead.company,
        'DBD Sector': lead.dbdSector || '',
        'Industry': lead.industryAI,
        'Juristic ID': lead.juristicId || '',
        'Capital': lead.capital || '',
        'Location': lead.province || lead.city || '',
        'Full Address': lead.fullAddress || '',
        'Contact Name': lead.customerName,
        'Phone': lead.phone,
        'Email': lead.email,
        'Job Title': lead.jobTitle || '',
        'Website': lead.website || '',
        'Lead Source': lead.leadSource || '',
        'Status': lead.status,
        'Sales Owner': lead.salesOwnerName || '',
        'Campaign': lead.campaignName,
        'Source': lead.source,
        'Talking Point': lead.talkingPoint || '',
        'Created Date': lead.date,
        'Clicked At': lead.clickedAt,
        'Contacted At': lead.contactedAt || '',
        'Closed At': lead.closedAt || '',
      }));
    }

    // Apply column filtering if fields param provided (skip for PDF - fixed layout)
    if (fields && format !== 'pdf' && dataToExport.length > 0) {
      const allColumnHeaders = Object.keys(dataToExport[0]);
      const requestedFields = fields.split(',').map(f => f.trim());
      const filteredColumns = requestedFields.filter(f => allColumnHeaders.includes(f));

      // Only filter if valid columns found, otherwise fallback to all
      if (filteredColumns.length > 0) {
        dataToExport = dataToExport.map(row => {
          const filtered: Record<string, string | number> = {};
          for (const col of filteredColumns) {
            if (col in row) {
              filtered[col] = row[col];
            }
          }
          return filtered;
        });
      }
    }

    // Generate file
    if (format === 'xlsx') {
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Leads');

      // Add columns with headers
      if (dataToExport.length > 0) {
        const columns = Object.keys(dataToExport[0]).map(key => ({
          header: key,
          key: key,
          width: 20,
        }));
        worksheet.columns = columns;

        // Set column widths (safe: only for columns present in current export)
        const columnWidthMap: Record<string, number> = {
          'Row': 8, 'Company': 25, 'DBD Sector': 15, 'Industry': 20,
          'Juristic ID': 18, 'Capital': 15, 'Location': 20, 'Full Address': 40,
          'Contact Name': 20, 'Phone': 15, 'Email': 25, 'Job Title': 20,
          'Website': 30, 'Lead Source': 15, 'Status': 12, 'Sales Owner': 20,
          'Campaign': 25, 'Source': 15, 'Talking Point': 30, 'Created Date': 18,
          'Clicked At': 18, 'Contacted At': 18, 'Closed At': 18,
        };
        const existingColumns = Object.keys(dataToExport[0]);
        for (const col of existingColumns) {
          if (columnWidthMap[col]) {
            worksheet.getColumn(col).width = columnWidthMap[col];
          }
        }

        // Add data rows
        dataToExport.forEach(row => {
          worksheet.addRow(row);
        });

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4A5568' }, // Dark gray
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 24;

        // Add borders to all cells
        const borderStyle = {
          top: { style: 'thin' as const, color: { argb: 'FFCBD5E0' } },
          left: { style: 'thin' as const, color: { argb: 'FFCBD5E0' } },
          bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E0' } },
          right: { style: 'thin' as const, color: { argb: 'FFCBD5E0' } },
        };

        // Apply borders and zebra striping to data rows
        for (let i = 2; i <= worksheet.rowCount; i++) {
          const row = worksheet.getRow(i);
          row.eachCell({ includeEmpty: true }, (cell) => {
            cell.border = borderStyle;
          });
          // Zebra striping (light gray for even rows)
          if (i % 2 === 0) {
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF7FAFC' },
            };
          }
          row.alignment = { vertical: 'middle' };
        }

        // Apply borders to header
        headerRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF2D3748' } },
            left: { style: 'thin', color: { argb: 'FF2D3748' } },
            bottom: { style: 'thin', color: { argb: 'FF2D3748' } },
            right: { style: 'thin', color: { argb: 'FF2D3748' } },
          };
        });

        // Freeze header row
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        // Add auto filter
        worksheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: Object.keys(dataToExport[0]).length },
        };
      }

      const buffer = await workbook.xlsx.writeBuffer();

      const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(buffer);

      logger.info('exportData completed', { type, format, rows: dataToExport.length });
    } else if (format === 'csv') {
      const { parse } = await import('json2csv');
      const csv = parse(dataToExport, { eol: '\n' });

      // Add UTF-8 BOM (EF BB BF) for Excel compatibility
      const csvWithBOM = '\uFEFF' + csv;

      const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(csvWithBOM);

      logger.info('exportData completed', { type, format, rows: dataToExport.length });
    } else if (format === 'pdf') {
      const PDFDocument = (await import('pdfkit')).default;
      const { join } = await import('path');
      const fs = await import('fs');

      // Register Thai font (Noto Sans Thai from Google Fonts)
      // Try multiple paths (prod, dev, test)
      const fontPaths = [
        join(process.cwd(), 'dist', 'assets', 'fonts', 'NotoSansThai-Regular.ttf'),
        join(process.cwd(), 'src', 'assets', 'fonts', 'NotoSansThai-Regular.ttf'),
      ];

      const fontPath = fontPaths.find(path => fs.existsSync(path));

      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });

      // Register and use Thai font if available
      let thaiFont: string | null = null;
      if (fontPath) {
        try {
          doc.registerFont('NotoSansThai', fontPath);
          thaiFont = 'NotoSansThai';
        } catch (error) {
          logger.warn('Failed to load Thai font, using default font', { error, fontPath });
          // Fallback to default font (Helvetica)
        }
      } else {
        logger.warn('Thai font not found, using default font', { searchedPaths: fontPaths });
        // Fallback to default font (Helvetica)
      }

      // Helper function to safely set Thai font
      const useThaiFont = () => {
        if (thaiFont) {
          try {
            doc.font(thaiFont);
          } catch {
            // Silently fallback to default font
          }
        }
      };

      const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      doc.pipe(res);

      // Title
      doc.fontSize(18);
      useThaiFont();
      doc.text(`${type.toUpperCase()} Export`, { align: 'center' });
      doc.fontSize(10);
      useThaiFont();
      doc.text(`Generated: ${new Date().toLocaleString('th-TH')} | Total: ${dataToExport.length} records`, { align: 'center' });
      doc.moveDown(0.5);

      // Table configuration
      const pdfData = dataToExport.slice(0, EXPORT.PDF_MAX_PREVIEW_ROWS);
      const startX = 40;
      const pageWidth = 842 - 80; // A4 landscape width minus margins
      const rowHeight = 20;
      const headerHeight = 24;
      const rowsPerPage = 22;

      // Column definitions (total width = pageWidth = 762)
      const columns = [
        { header: 'Company', width: 155, key: 'Company' },
        { header: 'Industry', width: 70, key: 'Industry' },
        { header: 'Juristic ID', width: 70, key: 'Juristic ID' },
        { header: 'Capital', width: 70, key: 'Capital' },
        { header: 'Email', width: 130, key: 'Email' },
        { header: 'Contact', width: 100, key: 'Contact Name' },
        { header: 'Phone', width: 60, key: 'Phone' },
        { header: 'Status', width: 50, key: 'Status' },
        { header: 'Owner', width: 67, key: 'Sales Owner' },
      ];

      // Helper function to draw text with clipping (prevents overflow and auto page break)
      const drawClippedText = (text: string, x: number, y: number, width: number, height: number, fontSize: number) => {
        doc.save();
        doc.rect(x, y, width, height).clip();
        doc.fontSize(fontSize);
        useThaiFont();
        doc.text(String(text || '-'), x + 3, y + (height - fontSize) / 2, { lineBreak: false });
        doc.restore();
      };

      // Helper function to draw table header
      const drawHeader = (y: number) => {
        // Header background
        doc.fillColor('#4a5568').rect(startX, y, pageWidth, headerHeight).fill();

        // Header text with clipping
        doc.fillColor('#ffffff');
        let x = startX;
        columns.forEach((col) => {
          drawClippedText(col.header, x, y, col.width, headerHeight, 8);
          x += col.width;
        });

        // Header border
        doc.strokeColor('#2d3748').lineWidth(1);
        doc.rect(startX, y, pageWidth, headerHeight).stroke();

        // Column dividers in header
        x = startX;
        columns.forEach((col) => {
          x += col.width;
          if (x < startX + pageWidth) {
            doc.moveTo(x, y).lineTo(x, y + headerHeight).stroke();
          }
        });

        return y + headerHeight;
      };

      // Helper function to draw a data row
      const drawRow = (row: Record<string, string | number>, y: number, isEven: boolean) => {
        // Row background (zebra striping)
        if (isEven) {
          doc.fillColor('#f7fafc').rect(startX, y, pageWidth, rowHeight).fill();
        }

        // Row text with clipping
        doc.fillColor('#1a202c');
        let x = startX;
        columns.forEach((col) => {
          const value = row[col.key] || '-';
          drawClippedText(String(value), x, y, col.width, rowHeight, 7);
          x += col.width;
        });

        // Row border
        doc.strokeColor('#cbd5e0').lineWidth(0.5);
        doc.rect(startX, y, pageWidth, rowHeight).stroke();

        // Column dividers
        x = startX;
        columns.forEach((col) => {
          x += col.width;
          if (x < startX + pageWidth) {
            doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
          }
        });

        return y + rowHeight;
      };

      // Draw table
      let currentY = doc.y + 10;
      currentY = drawHeader(currentY);

      pdfData.forEach((row, index) => {
        // Check if we need a new page
        if (index > 0 && index % rowsPerPage === 0) {
          doc.addPage();
          currentY = 40;
          currentY = drawHeader(currentY);
        }

        currentY = drawRow(row, currentY, index % 2 === 0);
      });

      // Footer message if more rows exist
      if (dataToExport.length > EXPORT.PDF_MAX_PREVIEW_ROWS) {
        doc.moveDown();
        doc.fillColor('#718096').fontSize(9);
        useThaiFont();
        doc.text(`... and ${dataToExport.length - EXPORT.PDF_MAX_PREVIEW_ROWS} more rows (use Excel/CSV for full data)`, startX, currentY + 15, { align: 'center', width: pageWidth });
      }

      doc.end();

      logger.info('exportData completed', { type, format, rows: dataToExport.length });
    }
  } catch (error) {
    logger.error('exportData failed', { error });
    next(error);
  }
}

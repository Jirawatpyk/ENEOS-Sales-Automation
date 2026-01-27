/**
 * Export Controller
 * Handles GET /api/admin/export
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';
import { parseDateFromSheets } from '../../utils/date-formatter.js';
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

    const { type, format, startDate, endDate, status, owner, campaign } = validation.data;

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

    if (startDate) {
      const startTime = new Date(startDate).getTime();
      filteredLeads = filteredLeads.filter((lead) => parseDateFromSheets(lead.date).getTime() >= startTime);
    }

    if (endDate) {
      const endTime = new Date(endDate).getTime();
      filteredLeads = filteredLeads.filter((lead) => parseDateFromSheets(lead.date).getTime() <= endTime);
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

        // Set column widths
        worksheet.getColumn('Row').width = 8;
        worksheet.getColumn('Company').width = 25;
        worksheet.getColumn('DBD Sector').width = 15;
        worksheet.getColumn('Industry').width = 20;
        worksheet.getColumn('Juristic ID').width = 18;
        worksheet.getColumn('Capital').width = 15;
        worksheet.getColumn('Location').width = 20;
        worksheet.getColumn('Full Address').width = 40;
        worksheet.getColumn('Contact Name').width = 20;
        worksheet.getColumn('Phone').width = 15;
        worksheet.getColumn('Email').width = 25;
        worksheet.getColumn('Job Title').width = 20;
        worksheet.getColumn('Website').width = 30;
        worksheet.getColumn('Lead Source').width = 15;
        worksheet.getColumn('Status').width = 12;
        worksheet.getColumn('Sales Owner').width = 20;
        worksheet.getColumn('Campaign').width = 25;
        worksheet.getColumn('Source').width = 15;
        worksheet.getColumn('Talking Point').width = 30;
        worksheet.getColumn('Created Date').width = 18;
        worksheet.getColumn('Clicked At').width = 18;
        worksheet.getColumn('Contacted At').width = 18;
        worksheet.getColumn('Closed At').width = 18;

        // Add data rows
        dataToExport.forEach(row => {
          worksheet.addRow(row);
        });

        // Style header row (bold)
        worksheet.getRow(1).font = { bold: true };
      }

      const buffer = await workbook.xlsx.writeBuffer();

      const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(buffer);

      logger.info('exportData completed', { type, format, rows: dataToExport.length });
    } else if (format === 'csv') {
      const { parse } = await import('json2csv');
      const csv = parse(dataToExport);

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

      // Register Thai font (TH Sarabun New)
      // Try multiple paths (prod, dev, test)
      const fontPaths = [
        join(process.cwd(), 'dist', 'assets', 'fonts', 'THSarabunNew.ttf'),
        join(process.cwd(), 'src', 'assets', 'fonts', 'THSarabunNew.ttf'),
      ];

      const fontPath = fontPaths.find(path => fs.existsSync(path));

      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      // Register and use Thai font if available
      if (fontPath) {
        try {
          doc.registerFont('THSarabunNew', fontPath);
          doc.font('THSarabunNew');
        } catch (error) {
          logger.warn('Failed to load Thai font, using default font', { error, fontPath });
          // Fallback to default font (Helvetica)
        }
      } else {
        logger.warn('Thai font not found, using default font', { searchedPaths: fontPaths });
        // Fallback to default font (Helvetica)
      }

      const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      doc.pipe(res);

      // Title
      doc.fontSize(20).text(`${type.toUpperCase()} Export`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString('th-TH')}`, { align: 'center' });
      doc.moveDown();

      // Add simple table (first N rows for PDF)
      const pdfData = dataToExport.slice(0, EXPORT.PDF_MAX_PREVIEW_ROWS);
      doc.fontSize(10);

      pdfData.forEach((row, index) => {
        if (index > 0 && index % 15 === 0) {
          doc.addPage();
        }

        const dbdSector = row['DBD Sector'] ? ` (DBD Sector: ${row['DBD Sector']})` : '';
        const juristicId = row['Juristic ID'] ? ` - Juristic ID: ${row['Juristic ID']}` : '';
        doc.text(`Row ${row.Row}: ${row['Contact Name']} - ${row.Company}${dbdSector}${juristicId} - Status: ${row.Status} - Owner: ${row['Sales Owner']}`);
        doc.moveDown(0.5);
      });

      if (dataToExport.length > EXPORT.PDF_MAX_PREVIEW_ROWS) {
        doc.moveDown();
        doc.text(`... and ${dataToExport.length - EXPORT.PDF_MAX_PREVIEW_ROWS} more rows`, { align: 'center' });
      }

      doc.end();

      logger.info('exportData completed', { type, format, rows: dataToExport.length });
    }
  } catch (error) {
    logger.error('exportData failed', { error });
    next(error);
  }
}

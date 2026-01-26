/**
 * Export Controller
 * Handles GET /api/admin/export
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';
import { parseDateFromSheets } from '../../utils/date-formatter.js';
import { EXPORT } from '../../constants/admin.constants.js';
import { exportQuerySchema, safeValidateQuery } from '../../validators/admin.validators.js';
import { getAllLeads } from './helpers/index.js';

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
      filteredLeads = filteredLeads.filter((lead) => lead.status === status);
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
        'Date': lead.date,
        'Customer Name': lead.customerName,
        'Email': lead.email,
        'Phone': lead.phone,
        'Company': lead.company,
        'Industry': lead.industryAI,
        'Website': lead.website || '',
        'Capital': lead.capital || '',
        'Status': lead.status,
        'Sales Owner': lead.salesOwnerName || '',
        'Campaign': lead.campaignName,
        'Source': lead.source,
        'Talking Point': lead.talkingPoint || '',
        'Clicked At': lead.clickedAt,
        'Closed At': lead.closedAt || '',
      }));
    }

    // Generate file
    if (format === 'xlsx') {
      const ExcelJS = await import('exceljs');
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
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);

      logger.info('exportData completed', { type, format, rows: dataToExport.length });
    } else if (format === 'csv') {
      const { parse } = await import('json2csv');
      const csv = parse(dataToExport);

      const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);

      logger.info('exportData completed', { type, format, rows: dataToExport.length });
    } else if (format === 'pdf') {
      const PDFDocument = (await import('pdfkit')).default;
      const doc = new PDFDocument({ size: 'A4', margin: 50 });

      const filename = `${type}_export_${new Date().toISOString().split('T')[0]}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      doc.pipe(res);

      // Title
      doc.fontSize(20).text(`${type.toUpperCase()} Export`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown();

      // Add simple table (first N rows for PDF)
      const pdfData = dataToExport.slice(0, EXPORT.PDF_MAX_PREVIEW_ROWS);
      doc.fontSize(10);

      pdfData.forEach((row, index) => {
        if (index > 0 && index % 15 === 0) {
          doc.addPage();
        }

        doc.text(`Row ${row.Row}: ${row['Customer Name']} (${row.Company}) - Status: ${row.Status}`);
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

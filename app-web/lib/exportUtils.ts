import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

/**
 * Exports data to an Excel (.xlsx) file and triggers a browser download.
 * Supports bold headers and custom column widths.
 *
 * @param data - Array of row objects to export.
 * @param fileName - File name without extension.
 * @param sheetName - Worksheet tab name.
 * @param columnWidths - Optional array of custom column widths.
 */
export async function exportToExcel(
  data: Record<string, any>[],
  fileName: string,
  sheetName: string = 'Sheet1',
  columnWidths?: number[]
) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    if (data.length === 0) {
      throw new Error('No data to export');
    }

    // Add headers
    const headers = Object.keys(data[0]);
    const headerRow = worksheet.addRow(headers);

    // Style headers
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }, // Indigo-600
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Add data rows
    data.forEach((item) => {
      const rowData = headers.map((header) => item[header]);
      worksheet.addRow(rowData);
    });

    // Set column widths
    worksheet.columns = headers.map((header, index) => {
      const customWidth = columnWidths?.[index];
      if (customWidth) return { width: customWidth };
      
      // Default auto-sizing based on header length and some padding
      return { width: Math.max(header.length + 10, 15) };
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Trigger download
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${fileName}.xlsx`);
    
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to generate Excel file');
  }
}

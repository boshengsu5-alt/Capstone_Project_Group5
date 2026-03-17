import * as XLSX from 'xlsx';

/**
 * Exports data to an Excel file.
 * @param data - Array of objects to export
 * @param fileName - Name of the file (without extension)
 * @param sheetName - Name of the worksheet
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Sheet1') {
  try {
    // Create a new workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer and trigger download
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to generate Excel file');
  }
}

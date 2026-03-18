import * as XLSX from 'xlsx';

/**
 * Exports data to an Excel (.xlsx) file and triggers a browser download.
 * 将数据导出为 Excel (.xlsx) 文件并触发浏览器下载。
 *
 * @param data - Array of row objects to export. 要导出的行数据数组
 * @param fileName - File name without extension. 文件名（不含扩展名）
 * @param sheetName - Worksheet tab name. 工作表标签名，默认 'Sheet1'
 */
export function exportToExcel(data: Record<string, unknown>[], fileName: string, sheetName: string = 'Sheet1') {
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

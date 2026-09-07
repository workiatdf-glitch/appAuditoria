const ExcelJS = require('exceljs');
const fs = require('fs');

const filePath = process.env.EXCEL_FILE_PATH || '/app/onedrive/control diabetes 26.xlsx';
const tmpPath = '/tmp/clean_excel.xlsx';

async function cleanExcel() {
  try {
    console.log("Starting cleanup...");
    await fs.promises.copyFile(filePath, tmpPath);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(tmpPath);
    const worksheet = workbook.getWorksheet('Hoja1');

    if (!worksheet) {
      console.error("Sheet Hoja1 not found");
      return;
    }

    let cleanedCount = 0;

    for (let i = 4; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let hasValue = false;
        if (cell.value !== null && cell.value !== undefined) {
          if (typeof cell.value === 'object' && 'richText' in cell.value) {
            const text = cell.value.richText.map(rt => rt.text).join('').trim();
            if (text.length > 0) hasValue = true;
          } else {
            const text = cell.value.toString().trim();
            if (text.length > 0) hasValue = true;
          }
        }

        if (!hasValue && cell.fill && (cell.fill.type !== 'pattern' || cell.fill.pattern !== 'none')) {
          cell.fill = { type: 'pattern', pattern: 'none' };
          cleanedCount++;
        }
      });
    }

    console.log(`Cleared fill from ${cleanedCount} empty cells.`);

    await workbook.xlsx.writeFile(tmpPath);
    await fs.promises.copyFile(tmpPath, filePath);
    console.log("Cleanup saved to original file.");
  } catch (err) {
    console.error("Error during cleanup:", err);
  }
}

cleanExcel();

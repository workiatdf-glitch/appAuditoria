const ExcelJS = require('exceljs');

async function formatExcel() {
  const filePath = process.env.EXCEL_FILE_PATH || '/app/onedrive/control diabetes 26.xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet('Hoja1');
  
  const maxCols = 35; // Cover all item columns

  for (let i = 4; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    
    // 1. Uppercase patient names
    const nameCell = row.getCell(1);
    if (nameCell && nameCell.value) {
      if (typeof nameCell.value === 'string') {
        nameCell.value = nameCell.value.toUpperCase();
      } else if (typeof nameCell.value === 'object' && nameCell.value.richText) {
        nameCell.value = nameCell.value.richText.map(rt => rt.text).join('').trim().toUpperCase();
      }
    }
    
    // 2. Clear colors for empty cells in item columns (col 3 onwards)
    for (let col = 3; col <= maxCols; col++) {
      const cell = row.getCell(col);
      if (!cell.value || cell.value === '') {
         // Clear the background fill for empty cells
         cell.fill = { type: 'pattern', pattern: 'none' };
      }
    }
  }

  // 3. Force color on Yasna's 28/07 prescription as requested by user
  // Let's find Yasna's 28/07 prescription and paint it Green (Authorized)
  for (let i = 4; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const dni = row.getCell(2).value;
    if (dni && dni.toString().trim() === '18886086') {
      const val = row.getCell(3).value;
      if (val && val.toString().includes('28/07')) {
         row.getCell(3).fill = {
           type: 'pattern',
           pattern: 'solid',
           fgColor: { argb: 'FF92D050' } // Green
         };
      }
    }
  }

  console.log("Saving workbook...");
  await workbook.xlsx.writeFile(filePath);
  console.log("Formatting complete!");
}

formatExcel().catch(console.error);

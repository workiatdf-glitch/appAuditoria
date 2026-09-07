const ExcelJS = require('exceljs');

async function checkFill() {
  const filePath = process.env.EXCEL_FILE_PATH || '/app/onedrive/control diabetes 26.xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet('Hoja1');
  
  // Find Yasna Marisel Saldivia
  let rowIndex = -1;
  for (let i = 4; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const dni = row.getCell(2).value;
    if (dni && dni.toString().trim() === '18886086') { // Saldivia Barrientos Yasna Marisel
      // Let's find the row with '(1) 28/07' in column 3 (TIRAS REACTIVAS DE GLUCOSA)
      const val = row.getCell(3).value;
      if (val && val.toString().includes('28/07')) {
         console.log('Found at row', i);
         console.log('Cell value:', val);
         console.log('Cell fill:', JSON.stringify(row.getCell(3).fill));
      }
    }
  }
}

checkFill().catch(console.error);

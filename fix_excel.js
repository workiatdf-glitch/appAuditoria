const ExcelJS = require('exceljs');

async function fix() {
  const filePath = '/app/onedrive/control diabetes 26.xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet('Hoja1');
  
  let francoRow = -1;
  let sitaCol = -1;
  
  // Find column
  const headerRow = worksheet.getRow(3);
  headerRow.eachCell((cell, colNumber) => {
    let text = cell.value ? cell.value.toString() : '';
    if (typeof cell.value === 'object' && cell.value.richText) {
      text = cell.value.richText.map(r => r.text).join('');
    }
    if (text.toUpperCase().includes('SITAGLIPTINA')) {
      sitaCol = colNumber;
    }
  });

  // Find Franco
  for (let i = 4; i <= worksheet.rowCount; i++) {
    const dniCell = worksheet.getCell(i, 2).value;
    if (dniCell && dniCell.toString().trim() === '25833528') {
      francoRow = i;
      break;
    }
  }

  console.log(`Franco row: ${francoRow}, Sita col: ${sitaCol}`);
  
  if (francoRow !== -1 && sitaCol !== -1) {
    const val = worksheet.getCell(francoRow, sitaCol).value;
    console.log(`Current value: ${val}`);
    worksheet.getCell(francoRow, sitaCol).value = null;
    worksheet.getCell(francoRow, sitaCol).fill = { type: 'pattern', pattern: 'none' }; // remove color
    await workbook.xlsx.writeFile(filePath);
    console.log("Fixed!");
  }
}

fix().catch(console.error);

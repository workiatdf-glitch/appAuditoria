const ExcelJS = require('exceljs');

async function run() {
  const filePath = process.env.EXCEL_FILE_PATH || '/app/onedrive/control diabetes 26.xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet('Hoja1');
  
  let found = false;
  for (let i = worksheet.rowCount - 20; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const dni = row.getCell(2).value; // Assuming DNI is in column 2
    let dniStr = '';
    if (dni) {
      if (typeof dni === 'object' && dni.richText) {
        dniStr = dni.richText.map(rt => rt.text).join('').trim();
      } else {
        dniStr = dni.toString().trim();
      }
    }
    
    if (dniStr === '36452590' || dniStr === '28742529') {
      console.log(`Found at row ${i}:`, row.values);
      found = true;
    }
  }
  
  if (!found) {
    console.log("Patients not found in the last 20 rows. Checking the entire file...");
    let foundAnywhere = false;
    for (let i = 4; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const dni = row.getCell(2).value;
      let dniStr = '';
      if (dni) {
        if (typeof dni === 'object' && dni.richText) {
          dniStr = dni.richText.map(rt => rt.text).join('').trim();
        } else {
          dniStr = dni.toString().trim();
        }
      }
      
      if (dniStr === '36452590' || dniStr === '28742529') {
        console.log(`Found at row ${i}:`, row.values);
        foundAnywhere = true;
      }
    }
    if (!foundAnywhere) console.log("Patients NOT FOUND anywhere in the Excel file.");
  }
}

run().catch(console.error);

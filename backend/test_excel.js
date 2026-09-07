const ExcelJS = require('exceljs');
async function run() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile('../data/data.xlsx');
  const sheet = wb.getWorksheet('Hoja1');
  let both = 0;
  let either = 0;
  let totalDni = 0;
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber < 4) return;
    const name = row.getCell(1).value;
    const dni = row.getCell(2).value;
    if (name && dni) both++;
    if (name || dni) either++;
    if (String(dni).includes('25833528') || String(name).toUpperCase().includes('FRANCO')) {
       console.log('Found:', rowNumber, name, dni);
    }
  });
  console.log({ both, either, totalRows: sheet.rowCount });
}
run().catch(console.error);

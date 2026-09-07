const ExcelJS = require('exceljs');
async function run() {
  const filePath = process.env.EXCEL_FILE_PATH || '/app/onedrive/control diabetes 26.xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet('Hoja1');
  const row = worksheet.getRow(3);
  const headers = [];
  row.eachCell((c, col) => headers.push(col + ': ' + (c.value && c.value.richText ? c.value.richText[0].text : c.value)));
  console.log(headers);
}
run().catch(console.error);

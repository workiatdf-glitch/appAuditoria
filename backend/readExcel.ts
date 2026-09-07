import * as ExcelJS from 'exceljs';

async function run() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('./data/data.xlsx');
  const ws = workbook.getWorksheet('Hoja1');
  const headers: string[] = [];
  ws.getRow(3).eachCell((cell, col) => {
    headers.push(cell.value?.toString() || '');
  });
  console.log('Headers:', headers);
}
run().catch(console.error);

const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');

const prisma = new PrismaClient();

async function fixColors() {
  const filePath = process.env.EXCEL_FILE_PATH || '/app/onedrive/control diabetes 26.xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet('Hoja1');
  
  const headerRow = worksheet.getRow(3);
  const colToItemName = {};
  for (let col = 3; col <= 35; col++) {
    const val = headerRow.getCell(col).value;
    if (val) colToItemName[col] = val.toString().trim();
  }

  const prescriptions = await prisma.prescription.findMany({
    include: { patient: true, item: true }
  });

  const pMap = {};
  for (const p of prescriptions) {
    if (!p.patient || !p.patient.dni) continue;
    const dni = p.patient.dni.toString().trim();
    if (!pMap[dni]) pMap[dni] = {};
    const itemName = p.item.name;
    if (!pMap[dni][itemName]) pMap[dni][itemName] = {};
    
    const d = new Date(p.datePrescribed);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateStr = `${day}/${month}`;
    
    pMap[dni][itemName][dateStr] = p.status;
  }

  for (let i = 4; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const dniCell = row.getCell(2).value;
    let dni = '';
    if (dniCell) {
       dni = typeof dniCell === 'object' && dniCell.richText ? dniCell.richText.map(rt=>rt.text).join('').trim() : dniCell.toString().trim();
    }

    // 1. CLEAR COLORS FOR NAMES AND DNIS
    row.getCell(1).fill = { type: 'pattern', pattern: 'none' };
    row.getCell(2).fill = { type: 'pattern', pattern: 'none' };

    for (let col = 3; col <= 35; col++) {
      const cell = row.getCell(col);
      const val = cell.value;
      
      // 2. CLEAR COLORS FOR EMPTY CELLS
      if (!val || val === '') {
         cell.fill = { type: 'pattern', pattern: 'none' };
         continue;
      }
      
      const strVal = typeof val === 'object' && val.richText ? val.richText.map(rt=>rt.text).join('').trim() : val.toString().trim();
      const itemName = colToItemName[col];
      
      let argb = 'FFFFFFFF'; // White fallback
      let isPainted = false;
      
      const dateMatch = strVal.match(/(\d{2}\/\d{2})/);
      
      // 3. COLOR BASED ON DATABASE
      if (dateMatch && dni && itemName && pMap[dni] && pMap[dni][itemName] && pMap[dni][itemName][dateMatch[1]]) {
         const status = pMap[dni][itemName][dateMatch[1]];
         if (status === 'AUTHORIZED') { argb = 'FF92D050'; isPainted = true; }
         else if (status === 'PARTIAL') { argb = 'FFFF99CC'; isPainted = true; }
         else if (status === 'DENIED') { argb = 'FFFF0000'; isPainted = true; }
      } 
      
      // 4. FALLBACK COLORING FOR OLD/MANUAL RECORDS
      if (!isPainted) {
         if (strVal.includes('[')) {
           argb = 'FFFF0000'; // Red
         } else if (strVal.includes('(')) {
           argb = 'FF92D050'; // Green
         }
      }
      
      cell.fill = {
         type: 'pattern',
         pattern: 'solid',
         fgColor: { argb }
      };
    }
  }

  console.log("Saving workbook...");
  await workbook.xlsx.writeFile(filePath);
  console.log("Color fix complete!");
}

fixColors().catch(console.error).finally(() => prisma.$disconnect());

const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sync() {
  const filePath = process.env.EXCEL_FILE_PATH || '/app/onedrive/control diabetes 26.xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet('Hoja1');
  
  if (!worksheet) {
    console.error('Hoja1 no encontrada');
    return;
  }

  // 1. Sync Items
  console.log("Syncing items...");
  const headerRow = worksheet.getRow(3);
  const itemNames = [];
  const colToItem = {}; // colNumber -> item name
  
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber > 3) {
      let text = '';
      if (cell.value && typeof cell.value === 'object' && cell.value.richText) {
        text = cell.value.richText.map(rt => rt.text).join('').trim();
      } else if (cell.value) {
        text = cell.value.toString().trim();
      }
      
      if (text && text.toUpperCase() !== 'OBSERVACION' && text.toUpperCase() !== 'OBSERVACIONES') {
        itemNames.push(text);
        colToItem[colNumber] = text;
      }
    }
  });

  // Upsert all items from Excel
  for (const name of itemNames) {
    await prisma.item.upsert({
      where: { name },
      update: {},
      create: { name }
    });
  }

  // Fetch items to get IDs
  const itemsInDb = await prisma.item.findMany();
  const itemNameMap = {};
  for (const item of itemsInDb) {
    itemNameMap[item.name.toUpperCase()] = item.id;
  }

  // Get admin user for createdBy
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.error("No admin user found to assign prescriptions to.");
    return;
  }

  // 2. Clear existing prescriptions (we will re-import all from Excel)
  console.log("Clearing existing prescriptions...");
  await prisma.prescription.deleteMany({});

  // 3. Import Prescriptions
  console.log("Importing prescriptions from Excel...");
  let presCount = 0;
  let currentPatientId = null;
  let currentDni = null;
  
  for (let i = 4; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const dniCell = row.getCell(2).value;
    
    let dniStr = '';
    if (dniCell) {
      if (typeof dniCell === 'object' && dniCell.richText) {
        dniStr = dniCell.richText.map(rt => rt.text).join('').trim();
      } else {
        dniStr = dniCell.toString().trim();
      }
    }

    if (dniStr) {
      currentDni = dniStr;
      const patient = await prisma.patient.findUnique({ where: { dni: currentDni } });
      currentPatientId = patient ? patient.id : null;
    }

    if (!currentPatientId) continue;

    // Parse each item column
    for (const [colStr, itemName] of Object.entries(colToItem)) {
      const colNumber = parseInt(colStr);
      const cell = row.getCell(colNumber);
      if (!cell.value) continue;

      let cellText = '';
      if (typeof cell.value === 'object' && cell.value.richText) {
        cellText = cell.value.richText.map(rt => rt.text).join('').trim();
      } else {
        cellText = cell.value.toString().trim();
      }

      // Format is usually (quantity) dd/mm
      const match = cellText.match(/\((\d+)\)\s*(\d{1,2})\/(\d{1,2})/);
      if (match) {
        const qty = parseInt(match[1]);
        const day = parseInt(match[2]);
        const month = parseInt(match[3]);
        
        // Assume 2026 for now, or use current year logic
        const datePrescribed = new Date(2026, month - 1, day, 12, 0, 0);
        
        // Check cell color for status (simplified)
        let status = 'AUTHORIZED';
        if (cell.fill && cell.fill.fgColor && cell.fill.fgColor.argb) {
          const argb = cell.fill.fgColor.argb.toUpperCase();
          if (argb === 'FFFF0000') status = 'DENIED'; // Red
          else if (argb === 'FFFF99CC') status = 'PARTIAL'; // Pink
        }
        
        let qtyAuth = status === 'DENIED' ? 0 : qty; // simplified

        const itemId = itemNameMap[itemName.toUpperCase()];
        if (itemId) {
          await prisma.prescription.create({
            data: {
              patientId: currentPatientId,
              itemId: itemId,
              datePrescribed: datePrescribed,
              quantityPrescribed: qty,
              quantityAuthorized: qtyAuth,
              status: status,
              createdById: admin.id
            }
          });
          presCount++;
        }
      }
    }
  }
  
  console.log(`Successfully imported ${presCount} prescriptions.`);
}
sync().catch(console.error).finally(() => prisma.$disconnect());

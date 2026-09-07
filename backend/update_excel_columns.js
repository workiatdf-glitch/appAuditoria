const ExcelJS = require('exceljs');
const fs = require('fs');

async function updateColumns() {
  const filePath = process.env.EXCEL_FILE_PATH || '/app/onedrive/control diabetes 26.xlsx';
  
  console.log("Loading workbook...");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet('Hoja1');
  
  if (!worksheet) {
    console.error("No se encontró Hoja1");
    return;
  }

  const headerRow = worksheet.getRow(3);
  let tirasIndex = -1;
  let glucoIndex = -1;

  // Find existing columns
  headerRow.eachCell((cell, colNumber) => {
    let text = '';
    if (cell.value && typeof cell.value === 'object' && cell.value.richText) {
      text = cell.value.richText.map(rt => rt.text).join('').trim();
    } else if (cell.value) {
      text = cell.value.toString().trim();
    }

    if (text.toUpperCase() === 'TIRAS REACTIVAS') {
      tirasIndex = colNumber;
    } else if (text.toUpperCase().includes('GLUCOMETROS') && text.toUpperCase().includes('LECTOR')) {
      glucoIndex = colNumber;
    }
  });

  if (tirasIndex === -1 || glucoIndex === -1) {
    console.error("No se encontraron las columnas esperadas:", { tirasIndex, glucoIndex });
    return;
  }

  // To avoid index shifting issues, let's process the right-most column first.
  // Actually, we can just use worksheet.spliceColumns.
  const modifications = [
    { name: 'TIRAS REACTIVAS', newName: 'TIRAS REACTIVAS DE GLUCOSA', insertName: 'TIRAS REACTIVAS DE CETONAS', originalIndex: tirasIndex },
    { name: 'GLUCOMETROS  / LECTOR', newName: 'GLUCOMETRO', insertName: 'LECTOR DE SENSORES', originalIndex: glucoIndex }
  ].sort((a, b) => b.originalIndex - a.originalIndex); // Sort descending to prevent index shifts

  for (const mod of modifications) {
    console.log(`Processing ${mod.name} at index ${mod.originalIndex}...`);
    
    // 1. Rename existing
    const cellToRename = worksheet.getCell(3, mod.originalIndex);
    cellToRename.value = mod.newName;

    // 2. Insert new column at originalIndex + 1
    // spliceColumns(start, deleteCount, insert)
    worksheet.spliceColumns(mod.originalIndex + 1, 0, []);

    // 3. Set header for the new column
    const newCell = worksheet.getCell(3, mod.originalIndex + 1);
    newCell.value = mod.insertName;

    // 4. Copy styles for the entire column from the original column
    // ExcelJS column styles can be set, but let's iterate rows and copy cell by cell
    for (let i = 1; i <= worksheet.rowCount; i++) {
      const sourceCell = worksheet.getCell(i, mod.originalIndex);
      const targetCell = worksheet.getCell(i, mod.originalIndex + 1);
      
      if (sourceCell.font) targetCell.font = JSON.parse(JSON.stringify(sourceCell.font));
      if (sourceCell.alignment) targetCell.alignment = JSON.parse(JSON.stringify(sourceCell.alignment));
      if (sourceCell.border) targetCell.border = JSON.parse(JSON.stringify(sourceCell.border));
      if (sourceCell.fill) targetCell.fill = JSON.parse(JSON.stringify(sourceCell.fill));
      
      // Also adjust width if possible
      const sourceCol = worksheet.getColumn(mod.originalIndex);
      const targetCol = worksheet.getColumn(mod.originalIndex + 1);
      if (sourceCol.width) targetCol.width = sourceCol.width;
    }
  }

  console.log("Saving changes...");
  await workbook.xlsx.writeFile(filePath);
  console.log("Excel update complete.");
}

updateColumns().catch(console.error);

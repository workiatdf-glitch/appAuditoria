const ExcelJS = require('exceljs');

async function addGliclazida() {
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
  let observacionIndex = -1;

  // Find OBSERVACION column
  headerRow.eachCell((cell, colNumber) => {
    let text = '';
    if (cell.value && typeof cell.value === 'object' && cell.value.richText) {
      text = cell.value.richText.map(rt => rt.text).join('').trim();
    } else if (cell.value) {
      text = cell.value.toString().trim();
    }

    if (text.toUpperCase() === 'OBSERVACION' || text.toUpperCase() === 'OBSERVACIONES') {
      observacionIndex = colNumber;
    }
  });

  if (observacionIndex === -1) {
    console.error("No se encontró la columna OBSERVACION");
    return;
  }

  console.log(`Inserting GLICLAZIDA at index ${observacionIndex}...`);

  // Insert new column AT observacionIndex (this shifts OBSERVACION to the right)
  worksheet.spliceColumns(observacionIndex, 0, []);

  // Set the header for the new column
  const newCell = worksheet.getCell(3, observacionIndex);
  newCell.value = 'GLICLAZIDA';

  // Copy styles from the previous column (which is now observacionIndex - 1)
  const prevColIndex = observacionIndex - 1;
  
  for (let i = 1; i <= worksheet.rowCount; i++) {
    const sourceCell = worksheet.getCell(i, prevColIndex);
    const targetCell = worksheet.getCell(i, observacionIndex);
    
    if (sourceCell.font) targetCell.font = JSON.parse(JSON.stringify(sourceCell.font));
    if (sourceCell.alignment) targetCell.alignment = JSON.parse(JSON.stringify(sourceCell.alignment));
    if (sourceCell.border) targetCell.border = JSON.parse(JSON.stringify(sourceCell.border));
    if (sourceCell.fill) targetCell.fill = JSON.parse(JSON.stringify(sourceCell.fill));
    
    const sourceCol = worksheet.getColumn(prevColIndex);
    const targetCol = worksheet.getColumn(observacionIndex);
    if (sourceCol.width) targetCol.width = sourceCol.width;
  }

  console.log("Saving changes...");
  await workbook.xlsx.writeFile(filePath);
  console.log("Excel update complete.");
}

addGliclazida().catch(console.error);

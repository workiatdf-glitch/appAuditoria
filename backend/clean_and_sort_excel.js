const ExcelJS = require('exceljs');

async function cleanAndSort() {
  const filePath = process.env.EXCEL_FILE_PATH || '/app/onedrive/control diabetes 26.xlsx';
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.getWorksheet('Hoja1');
  
  const patients = [];
  let currentGroup = null;
  const maxCols = 35; // We know columns are up to 28 (OBSERVACION)

  for (let i = 4; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    
    let rowHasData = false;
    for (let col = 1; col <= maxCols; col++) {
      const cell = row.getCell(col);
      if (cell.value !== null && cell.value !== '') {
        rowHasData = true;
        break;
      }
    }
    
    if (!rowHasData) continue; 

    let patientName = '';
    const nameCell = row.getCell(1).value;
    if (nameCell) {
       patientName = typeof nameCell === 'object' && nameCell.richText ? nameCell.richText.map(rt=>rt.text).join('').trim() : nameCell.toString().trim();
    }
    
    let dni = '';
    const dniCell = row.getCell(2).value;
    if (dniCell) {
       dni = typeof dniCell === 'object' && dniCell.richText ? dniCell.richText.map(rt=>rt.text).join('').trim() : dniCell.toString().trim();
    }

    let groupKey = dni || patientName || 'UNKNOWN';
    if (!dni && !patientName && currentGroup) {
      groupKey = currentGroup.groupKey; 
    }

    let existingGroup = patients.find(p => p.groupKey === groupKey);
    if (!existingGroup) {
      existingGroup = { 
        groupKey: groupKey, 
        sortKey: patientName ? patientName.toLowerCase() : groupKey.toLowerCase(), 
        rows: [] 
      };
      patients.push(existingGroup);
    }
    
    currentGroup = existingGroup;
    
    const rowData = [];
    for (let col = 1; col <= maxCols; col++) {
      const cell = row.getCell(col);
      rowData.push({
        value: cell.value,
        font: cell.font ? JSON.parse(JSON.stringify(cell.font)) : null,
        alignment: cell.alignment ? JSON.parse(JSON.stringify(cell.alignment)) : null,
        border: cell.border ? JSON.parse(JSON.stringify(cell.border)) : null,
        fill: cell.fill ? JSON.parse(JSON.stringify(cell.fill)) : null,
      });
    }
    existingGroup.rows.push(rowData);
  }

  patients.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  let targetRowIdx = 4;
  for (const group of patients) {
    for (const rowData of group.rows) {
      const row = worksheet.getRow(targetRowIdx);
      for (let col = 1; col <= maxCols; col++) {
        const cellData = rowData[col - 1];
        const cell = row.getCell(col);
        cell.value = cellData.value;
        if (cellData.font) cell.font = cellData.font;
        if (cellData.alignment) cell.alignment = cellData.alignment;
        if (cellData.border) cell.border = cellData.border;
        if (cellData.fill) cell.fill = cellData.fill;
      }
      targetRowIdx++;
    }
  }

  for (let i = targetRowIdx; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    for (let col = 1; col <= maxCols; col++) {
      const cell = row.getCell(col);
      cell.value = null;
      cell.style = {}; 
    }
  }

  console.log("Saving workbook...");
  await workbook.xlsx.writeFile(filePath);
  console.log("Sort and cleanup complete! TargetRowIdx ended at: " + targetRowIdx);
}

cleanAndSort().catch(console.error);

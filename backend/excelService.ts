import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

class Mutex {
  private mutex = Promise.resolve();
  lock(): Promise<() => void> {
    let begin: (unlock: () => void) => void = () => {};
    this.mutex = this.mutex.then(() => {
      return new Promise(begin);
    });
    return new Promise(res => {
      begin = res;
    });
  }
}
const excelMutex = new Mutex();

const filePath = process.env.EXCEL_FILE_PATH || '/app/data/data.xlsx';
const tmpPath = '/tmp/temp_excel.xlsx';

export const addPatientToExcel = async (patientDni: string, patientName: string) => {
  const unlock = await excelMutex.lock();
  try {
    // WORKAROUND: Copy to /tmp to avoid macOS FileProvider -35 read error over Docker virtiofs
    await fs.promises.copyFile(filePath, tmpPath);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(tmpPath);
    const worksheet = workbook.getWorksheet('Hoja1');
    if (!worksheet) return;

    let patientExists = false;
    let insertRow = -1;
    let lastRealRow = 3;

    const normalizedNewName = patientName.trim().toUpperCase();

    for (let i = 4; i <= worksheet.rowCount; i++) {
      const nameCell = worksheet.getCell(i, 1).value;
      const dniCell = worksheet.getCell(i, 2).value;

      let rowHasData = false;
      if (nameCell || dniCell) {
        rowHasData = true;
      } else {
        worksheet.getRow(i).eachCell((cell) => {
          if (cell.value !== null && cell.value !== '') rowHasData = true;
        });
      }

      if (rowHasData) {
        lastRealRow = i;
      } else {
        // Stop scanning when we hit the empty formatted rows at the bottom
        break;
      }

      if (dniCell && dniCell.toString().trim() === patientDni) {
        patientExists = true;
        break;
      }

      if (nameCell && nameCell.toString().trim() !== '') {
        const currentName = nameCell.toString().trim().toUpperCase();
        // localeCompare > 0 means currentName comes alphabetically AFTER normalizedNewName
        if (insertRow === -1 && currentName.localeCompare(normalizedNewName) > 0) {
          insertRow = i;
        }
      }
    }

    if (!patientExists) {
      if (insertRow === -1) {
        insertRow = lastRealRow + 1;
      }
      const referenceRow = Math.max(4, insertRow - 1);
      const refRowObj = worksheet.getRow(referenceRow);
      
      worksheet.spliceRows(insertRow, 0, []);
      const newRow = worksheet.getRow(insertRow);
      
      newRow.getCell(1).value = patientName;
      newRow.getCell(2).value = patientDni;

      // Copy styles by replacing the entire style object to avoid inheritance
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = newRow.getCell(col);
        const prevCell = refRowObj.getCell(col);
        
        const newStyle: Partial<ExcelJS.Style> = {};
        if (prevCell.font) newStyle.font = JSON.parse(JSON.stringify(prevCell.font));
        if (prevCell.alignment) newStyle.alignment = JSON.parse(JSON.stringify(prevCell.alignment));
        if (prevCell.border) newStyle.border = JSON.parse(JSON.stringify(prevCell.border));
        
        cell.style = newStyle;
      }

      await workbook.xlsx.writeFile(tmpPath);
      await fs.promises.copyFile(tmpPath, filePath);
      console.log("Patient added to Excel alphabetically at row", insertRow);
    }
  } catch (err) {
    console.error("Error adding patient to Excel:", err);
  } finally {
    unlock();
  }
};

export const addPrescriptionToExcel = async (patientDni: string, patientName: string, itemName: string, quantity: number, datePrescribed: Date, status: string) => {
  const unlock = await excelMutex.lock();
  try {
    // WORKAROUND: Copy to /tmp to avoid macOS FileProvider -35 read error over Docker virtiofs
    await fs.promises.copyFile(filePath, tmpPath);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(tmpPath);
    const worksheet = workbook.getWorksheet('Hoja1');
    
    if (!worksheet) {
      console.error("Sheet Hoja1 not found");
      return;
    }

    // Find item column from Row 3
    let itemCol = -1;
    const headerRow = worksheet.getRow(3);
    headerRow.eachCell((cell: ExcelJS.Cell, colNumber: number) => {
      let cellText = '';
      if (cell.value && typeof cell.value === 'object' && 'richText' in cell.value) {
        cellText = (cell.value as ExcelJS.CellRichTextValue).richText.map(rt => rt.text).join('').trim();
      } else if (cell.value) {
        cellText = cell.value.toString().trim();
      }
      
      if (cellText.toUpperCase() === itemName.toUpperCase()) {
        itemCol = colNumber;
      }
    });

    if (itemCol === -1) {
      console.error("Item column not found in Excel for:", itemName);
      return;
    }

    let lastPatientRowIdx = -1;
    let firstPatientRowIdx = -1;
    let isNewPatient = true;
    let insertRow = -1;
    let lastRealRow = 3;

    const normalizedNewName = patientName.trim().toUpperCase();

    for (let i = 4; i <= worksheet.rowCount; i++) {
      const nameCell = worksheet.getCell(i, 1).value;
      const dniCell = worksheet.getCell(i, 2).value;

      let rowHasData = false;
      if (nameCell || dniCell) {
        rowHasData = true;
      } else {
        worksheet.getRow(i).eachCell((cell) => {
          if (cell.value !== null && cell.value !== '') rowHasData = true;
        });
      }

      if (rowHasData) {
        lastRealRow = i;
      } else {
        break; // Reached the empty rows at the bottom
      }

      if (dniCell && dniCell.toString().trim() === patientDni) {
        if (firstPatientRowIdx === -1) firstPatientRowIdx = i;
        lastPatientRowIdx = i;
        isNewPatient = false;
      } else if (!isNewPatient && dniCell) {
        // If we hit the next patient (has DNI), stop searching
        break;
      } else if (!isNewPatient && !dniCell) {
        // If we are in empty rows under the patient, verify the row has actual data before updating lastPatientRowIdx
        if (rowHasData) {
          lastPatientRowIdx = i;
        }
      } else if (isNewPatient && nameCell && nameCell.toString().trim() !== '') {
        const currentName = nameCell.toString().trim().toUpperCase();
        if (insertRow === -1 && currentName.localeCompare(normalizedNewName) > 0) {
          insertRow = i;
        }
      }
    }

    const dateStr = `${datePrescribed.getDate().toString().padStart(2, '0')}/${(datePrescribed.getMonth() + 1).toString().padStart(2, '0')}`;
    const newEntry = `(${quantity}) ${dateStr}`;

    let targetRowIdx = -1;
    if (!isNewPatient) {
      // Check backwards from lastPatientRowIdx up to find a row matching dateStr for this patient
      for (let i = lastPatientRowIdx; i >= 4; i--) {
        const dni = worksheet.getCell(i, 2).value;
        if (dni && dni.toString().trim() === patientDni) {
          const row = worksheet.getRow(i);
          let foundDate = false;
          row.eachCell((cell, colNumber) => {
            if (colNumber > 2 && cell.value) {
              let cellValStr = '';
              if (typeof cell.value === 'object' && 'richText' in cell.value) {
                cellValStr = (cell.value as ExcelJS.CellRichTextValue).richText.map(rt => rt.text).join('');
              } else {
                cellValStr = cell.value.toString();
              }
              if (cellValStr.includes(dateStr)) {
                foundDate = true;
              }
            }
          });
          if (foundDate) {
            targetRowIdx = i;
            break;
          }
        }
      }
    }

    let targetCell;

    if (isNewPatient) {
      if (insertRow === -1) {
        insertRow = lastRealRow + 1;
      }
      const referenceRow = Math.max(4, insertRow - 1);
      const refRowObj = worksheet.getRow(referenceRow);
      
      worksheet.spliceRows(insertRow, 0, []);
      const newRow = worksheet.getRow(insertRow);
      
      newRow.getCell(1).value = patientName;
      newRow.getCell(2).value = patientDni;
      
      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = newRow.getCell(col);
        const prevCell = refRowObj.getCell(col);
        
        const newStyle: Partial<ExcelJS.Style> = {};
        if (prevCell.font) newStyle.font = JSON.parse(JSON.stringify(prevCell.font));
        if (prevCell.alignment) newStyle.alignment = JSON.parse(JSON.stringify(prevCell.alignment));
        if (prevCell.border) newStyle.border = JSON.parse(JSON.stringify(prevCell.border));
        
        cell.style = newStyle;
      }
      targetCell = newRow.getCell(itemCol);
    } else if (targetRowIdx !== -1) {
      // Reuse the existing row for the same day
      const row = worksheet.getRow(targetRowIdx);
      targetCell = row.getCell(itemCol);
    } else {
      // Create new row under the same patient for a new date
      const referenceRow = worksheet.getRow(firstPatientRowIdx !== -1 ? firstPatientRowIdx : lastPatientRowIdx);
      const prevRow = worksheet.getRow(lastPatientRowIdx);
      worksheet.spliceRows(lastPatientRowIdx + 1, 0, []);
      const newRow = worksheet.getRow(lastPatientRowIdx + 1);
      
      newRow.getCell(1).value = patientName;
      newRow.getCell(2).value = patientDni;

      for (let col = 1; col <= worksheet.columnCount; col++) {
        const cell = newRow.getCell(col);
        const refCell = referenceRow.getCell(col);
        
        const newStyle: Partial<ExcelJS.Style> = {};
        if (refCell.font) newStyle.font = JSON.parse(JSON.stringify(refCell.font));
        if (refCell.alignment) newStyle.alignment = JSON.parse(JSON.stringify(refCell.alignment));
        if (refCell.border) newStyle.border = JSON.parse(JSON.stringify(refCell.border));
        
        if (col <= 2 && refCell.fill) {
          newStyle.fill = JSON.parse(JSON.stringify(refCell.fill));
        }
        
        cell.style = newStyle;
      }

      targetCell = newRow.getCell(itemCol);
    }

    targetCell.value = newEntry;

    // Apply color based on status
    let argb = 'FFFFFFFF'; // default white
    if (status === 'AUTHORIZED') argb = 'FF92D050'; // Green
    else if (status === 'PARTIAL') argb = 'FFFF99CC'; // Pink
    else if (status === 'DENIED') argb = 'FFFF0000'; // Red

    targetCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb }
    };

    await workbook.xlsx.writeFile(tmpPath);
    await fs.promises.copyFile(tmpPath, filePath);
    console.log("Successfully synced prescription to Excel");

  } catch (err) {
    console.error("Error syncing to Excel:", err);
  } finally {
    unlock();
  }
};

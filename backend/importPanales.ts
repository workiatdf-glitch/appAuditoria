import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import { addPatientToExcel } from './excelService';

const prisma = new PrismaClient();
const EXCEL_FILE_PATH = process.env.EXCEL_FILE_PATH || '/app/data/data.xlsx';
const TMP_PATH = '/tmp/temp_excel.xlsx';

async function run() {
  console.log("Starting import script...");

  // 1. Get or create item PAÑALES
  const panalesName = 'PAÑALES';
  let panalesItem = await prisma.item.findUnique({ where: { name: panalesName } });
  if (!panalesItem) {
    panalesItem = await prisma.item.create({ data: { name: panalesName } });
    console.log("Created item PAÑALES in DB");
  } else {
    console.log("PAÑALES item already exists in DB");
  }

  // 2. Add PAÑALES column to Excel
  await fs.promises.copyFile(EXCEL_FILE_PATH, TMP_PATH);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TMP_PATH);
  const ws = workbook.getWorksheet('Hoja1');
  
  if (!ws) {
    throw new Error('Hoja1 not found');
  }

  let itemCol = -1;
  const headerRow = ws.getRow(3);
  headerRow.eachCell((cell, colNumber) => {
    const val = cell.value?.toString().trim().toUpperCase();
    if (val === panalesName) {
      itemCol = colNumber;
    }
  });

  if (itemCol === -1) {
    itemCol = ws.columnCount + 1;
    const refCell = headerRow.getCell(3); // Copy style from C3
    const newCell = headerRow.getCell(itemCol);
    newCell.value = panalesName;
    if (refCell.style) {
      newCell.style = JSON.parse(JSON.stringify(refCell.style));
    }
    // Also copy row 1 and 2 if needed? Wait, row 1 and 2 might just be blank or have generic styles. 
    // Just save it.
    await workbook.xlsx.writeFile(TMP_PATH);
    await fs.promises.copyFile(TMP_PATH, EXCEL_FILE_PATH);
    console.log("Added PAÑALES column to Excel at position", itemCol);
  } else {
    console.log("PAÑALES column already exists in Excel at position", itemCol);
  }

  // 3. Read CSV and import
  const adminUser = await prisma.user.findFirst();
  if (!adminUser) {
    throw new Error("No admin user found to attribute prescriptions to.");
  }

  const csvText = fs.readFileSync('/app/panales.csv', 'utf-8');
  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l);

  // Skip header
  let headersSkipped = false;
  for (const line of lines) {
    if (line.toLowerCase().startsWith('fecha')) {
      headersSkipped = true;
      continue;
    }

    const [fechaReceta, fechaDispensa, nombre, dniRaw, medicamento, cantidadRaw, decision] = line.split(';');
    if (!dniRaw) continue;

    // Clean DNI: extract consecutive digits, take the longest sequence (or specifically the rightmost sequence)
    const matches = dniRaw.match(/\d+/g);
    let dni = '';
    if (matches) {
      dni = matches.reduce((a, b) => a.length > b.length ? a : b); // Usually DNI is 7-8 digits
    }

    if (!dni || dni.length < 5) {
      console.log("Skipping invalid DNI line:", line);
      continue;
    }

    // Split nombre into firstName and lastName (assume first word is LastName, rest is FirstName, or just put all in LastName)
    const nameParts = nombre.split(' ');
    let lastName = nameParts[0] || 'Desconocido';
    let firstName = nameParts.slice(1).join(' ');
    if (!firstName) firstName = ' ';

    let quantity = parseInt(cantidadRaw) || 0;

    let status = 'AUTHORIZED';
    if (decision.toLowerCase().includes('rechazado')) status = 'DENIED';
    // Let's assume Authorized

    let datePrescribed = new Date();
    if (fechaDispensa) {
      const parts = fechaDispensa.split('/');
      if (parts.length === 3) {
        let year = parseInt(parts[2]);
        if (year < 2000) year += 2000;
        datePrescribed = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
      }
    }

    // Check DB patient
    let patient = await prisma.patient.findUnique({ where: { dni } });
    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          dni,
          firstName: firstName.toUpperCase(),
          lastName: lastName.toUpperCase(),
          patientType: 'TIPO_2' // Default
        }
      });
      // Add to excel 
      await addPatientToExcel(dni, `${lastName.toUpperCase()} ${firstName.toUpperCase()}`);
      console.log(`Created new patient: ${dni} - ${lastName} ${firstName}`);
    }

    // Add prescription to DB
    await prisma.prescription.create({
      data: {
        patientId: patient.id,
        itemId: panalesItem.id,
        datePrescribed,
        quantityPrescribed: quantity,
        quantityAuthorized: quantity,
        status,
        createdById: adminUser.id,
        notes: decision || ''
      }
    });

    // Add prescription to Excel dynamically? 
    // It's better to just call `addPrescriptionToExcel` so it stays exactly synced.
    const { addPrescriptionToExcel } = require('./excelService');
    await addPrescriptionToExcel(dni, `${patient.lastName} ${patient.firstName}`, panalesName, quantity, datePrescribed, status);
    
    console.log(`Added prescription for ${dni}: ${quantity} pañales on ${datePrescribed.toISOString()}`);
  }

  console.log("Import complete.");
}

run().catch(e => {
  console.error("Error during import:", e);
  process.exit(1);
});

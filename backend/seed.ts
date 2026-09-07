import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

export async function runAutoSeed() {
  try {
    const patientCount = await prisma.patient.count();
    if (patientCount > 0) {
      console.log(`Database already contains ${patientCount} patients. Skipping seed.`);
      return;
    }

    const candidatePaths = [
      path.resolve(__dirname, '../prisma/seed_data.json'),
      path.resolve(__dirname, './prisma/seed_data.json'),
      path.resolve(process.cwd(), 'prisma/seed_data.json'),
      path.resolve(process.cwd(), 'backend/prisma/seed_data.json')
    ];

    const actualPath = candidatePaths.find(p => fs.existsSync(p));

    if (!actualPath) {
      console.log('No seed_data.json found. Skipping seed.');
      return;
    }

    console.log('Database is empty. Populating data from:', actualPath);
    const raw = fs.readFileSync(actualPath, 'utf-8');
    const { users, items, patients, prescriptions } = JSON.parse(raw);

    // 1. Users
    if (users && users.length > 0) {
      for (const u of users) {
        await prisma.user.upsert({
          where: { id: u.id },
          update: {},
          create: {
            id: u.id,
            username: u.username,
            password: u.password,
            role: u.role
          }
        });
      }
      console.log(`Seeded ${users.length} users.`);
    }

    // 2. Items
    if (items && items.length > 0) {
      for (const it of items) {
        await prisma.item.upsert({
          where: { id: it.id },
          update: {},
          create: {
            id: it.id,
            name: it.name
          }
        });
      }
      console.log(`Seeded ${items.length} items.`);
    }

    // 3. Patients (in batches)
    if (patients && patients.length > 0) {
      for (let i = 0; i < patients.length; i += 100) {
        const batch = patients.slice(i, i + 100).map((p: any) => ({
          id: p.id,
          dni: p.dni,
          firstName: p.firstName,
          lastName: p.lastName,
          patientType: p.patientType,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt)
        }));
        await prisma.patient.createMany({
          data: batch,
          skipDuplicates: true
        });
      }
      console.log(`Seeded ${patients.length} patients.`);
    }

    // 4. Prescriptions (in batches)
    if (prescriptions && prescriptions.length > 0) {
      for (let i = 0; i < prescriptions.length; i += 200) {
        const batch = prescriptions.slice(i, i + 200).map((pr: any) => ({
          id: pr.id,
          patientId: pr.patientId,
          itemId: pr.itemId,
          datePrescribed: new Date(pr.datePrescribed),
          quantityPrescribed: pr.quantityPrescribed,
          quantityAuthorized: pr.quantityAuthorized,
          status: pr.status,
          notes: pr.notes || null,
          createdById: pr.createdById,
          createdAt: new Date(pr.createdAt),
          updatedAt: new Date(pr.updatedAt)
        }));
        await prisma.prescription.createMany({
          data: batch,
          skipDuplicates: true
        });
      }
      console.log(`Seeded ${prescriptions.length} prescriptions.`);
    }

    console.log('✅ Automatic database seeding completed successfully!');
  } catch (err) {
    console.error('Error during auto-seeding:', err);
  }
}

if (require.main === module) {
  runAutoSeed().then(() => prisma.$disconnect());
}

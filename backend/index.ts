import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { addPrescriptionToExcel, addPatientToExcel } from './excelService';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret123';

app.use(cors());
app.use(express.json());

// --- Authentication Middleware ---
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Auth Routes ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  
  // Temporary workaround for unhashed migrated password 'admin'
  if (user && user.password === password) {
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
      return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  }

  if (user && await bcrypt.compare(password, user.password)) {
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  }
  return res.status(401).json({ error: 'Credenciales inválidas' });
});

// --- User Management Routes ---
const authorizeAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Acceso denegado' });
  next();
};

app.get('/api/users', authenticateToken, authorizeAdmin, async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true }
  });
  res.json(users);
});

app.post('/api/users', authenticateToken, authorizeAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashedPassword, role: role || 'USER' },
      select: { id: true, username: true, role: true }
    });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: 'El usuario ya existe' });
  }
});

app.put('/api/users/:id/password', authenticateToken, async (req: any, res: any) => {
  const { id } = req.params;
  const { password } = req.body;
  
  if (req.user.role !== 'ADMIN' && req.user.id !== id) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando contraseña' });
  }
});

app.delete('/api/users/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

// --- Patient Routes ---
app.get('/api/patients', authenticateToken, async (req, res) => {
  const { dni } = req.query;
  try {
    if (dni) {
      const patient = await prisma.patient.findUnique({ where: { dni: String(dni) } });
      if (patient) return res.json([patient]);
      return res.json([]);
    }
    const patients = await prisma.patient.findMany({ orderBy: { lastName: 'asc' } });
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching patients' });
  }
});

app.post('/api/patients', authenticateToken, async (req, res) => {
  const { dni, firstName, lastName, patientType } = req.body;
  try {
    const patient = await prisma.patient.create({
      data: { dni, firstName, lastName, patientType: patientType || 'TIPO_2' }
    });
    
    // Add empty row for this new patient in Excel
    await addPatientToExcel(dni, `${lastName} ${firstName}`);

    res.json(patient);
  } catch (err) {
    res.status(400).json({ error: 'El paciente ya existe o los datos son inválidos' });
  }
});

app.get('/api/patients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({ where: { id } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching patient' });
  }
});

app.put('/api/patients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { patientType, dni, firstName, lastName } = req.body;
  try {
    const patient = await prisma.patient.update({
      where: { id },
      data: { 
        ...(patientType && { patientType }),
        ...(dni && { dni }),
        ...(firstName && { firstName }),
        ...(lastName && { lastName })
      }
    });
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'Error updating patient' });
  }
});

app.delete('/api/patients/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    // Delete all prescriptions for this patient first
    await prisma.prescription.deleteMany({ where: { patientId: id } });
    await prisma.patient.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting patient' });
  }
});

app.get('/api/patients/:id/history', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const prescriptions = await prisma.prescription.findMany({
      where: { patientId: id },
      include: { item: true, createdBy: { select: { username: true } } },
      orderBy: { datePrescribed: 'desc' }
    });
    res.json(prescriptions);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching history' });
  }
});

app.get('/api/patients/:id/items/:itemId/last-prescription', authenticateToken, async (req, res) => {
  const { id, itemId } = req.params;
  try {
    const lastPrescription = await prisma.prescription.findFirst({
      where: { patientId: id, itemId: itemId },
      orderBy: { datePrescribed: 'desc' },
      select: { datePrescribed: true }
    });
    res.json(lastPrescription || null);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching last prescription' });
  }
});

// --- Items Routes ---
app.get('/api/items', authenticateToken, async (req, res) => {
  const items = await prisma.item.findMany({ orderBy: { name: 'asc' } });
  res.json(items);
});

// --- Prescription Routes ---
app.post('/api/prescriptions', authenticateToken, async (req: any, res: any) => {
  const { patientId, itemId, datePrescribed, quantityPrescribed, quantityAuthorized: qaInput } = req.body;
  const userId = req.user.id;
  
  try {
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) return res.status(404).json({ error: 'Paciente no encontrado' });

    let quantityAuthorized = qaInput !== undefined ? Number(qaInput) : Number(quantityPrescribed);
    let status = 'AUTHORIZED';

    if (quantityAuthorized === 0) {
      status = 'DENIED';
    } else if (quantityAuthorized < quantityPrescribed) {
      status = 'PARTIAL';
    } else {
      status = 'AUTHORIZED';
    }

    const prescription = await prisma.prescription.create({
      data: {
        patientId,
        itemId,
        datePrescribed: new Date(datePrescribed),
        quantityPrescribed,
        quantityAuthorized,
        status,
        createdById: userId
      },
      include: { item: true, createdBy: { select: { username: true } }, patient: true }
    });

    // Sync to Excel
    await addPrescriptionToExcel(
      prescription.patient.dni,
      `${prescription.patient.lastName} ${prescription.patient.firstName}`.trim(),
      prescription.item.name,
      prescription.quantityAuthorized,
      prescription.datePrescribed,
      prescription.status
    );

    res.json(prescription);
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar receta' });
  }
});

app.put('/api/prescriptions/:id', authenticateToken, async (req: any, res: any) => {
  const { id } = req.params;
  const { datePrescribed, quantityPrescribed, quantityAuthorized: qaInput, notes } = req.body;
  try {
    let quantityAuthorized = qaInput !== undefined ? Number(qaInput) : undefined;
    let status = undefined;
    if (quantityAuthorized !== undefined && quantityPrescribed !== undefined) {
      if (quantityAuthorized === 0) status = 'DENIED';
      else if (quantityAuthorized < Number(quantityPrescribed)) status = 'PARTIAL';
      else status = 'AUTHORIZED';
    }

    const prescription = await prisma.prescription.update({
      where: { id },
      data: {
        ...(datePrescribed && { datePrescribed: new Date(datePrescribed) }),
        ...(quantityPrescribed !== undefined && { quantityPrescribed: Number(quantityPrescribed) }),
        ...(quantityAuthorized !== undefined && { quantityAuthorized }),
        ...(status && { status }),
        ...(notes !== undefined && { notes })
      }
    });
    res.json(prescription);
  } catch (err) {
    res.status(500).json({ error: 'Error updating prescription' });
  }
});

app.delete('/api/prescriptions/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.prescription.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Error deleting prescription' });
  }
});

// --- DataGrid Route ---
app.get('/api/datagrid', authenticateToken, async (req: any, res: any) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause: any = {};
    if (startDate || endDate) {
      whereClause.datePrescribed = {};
      if (startDate) whereClause.datePrescribed.gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        whereClause.datePrescribed.lte = end;
      }
    }

    const patients = await prisma.patient.findMany({
      orderBy: { lastName: 'asc' },
      include: {
        prescriptions: {
          where: whereClause,
          include: { item: true }
        }
      }
    });
    
    const items = await prisma.item.findMany({
      orderBy: { name: 'asc' }
    });

    // Formatting for DataGrid:
    // row: { patientId, dni, name, items: { [itemId]: [ { id, date, qty, status } ] } }
    const grid = patients.map(p => {
      const rowItems: Record<string, any[]> = {};
      p.prescriptions.forEach(rx => {
        if (!rowItems[rx.itemId]) rowItems[rx.itemId] = [];
        rowItems[rx.itemId].push({
          id: rx.id,
          datePrescribed: rx.datePrescribed,
          quantityAuthorized: rx.quantityAuthorized,
          status: rx.status
        });
      });
      
      return {
        id: p.id,
        dni: p.dni,
        name: `${p.lastName} ${p.firstName}`.trim(),
        patientType: p.patientType,
        items: rowItems
      };
    });

    res.json({ items, grid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching datagrid' });
  }
});

// --- Analytics Route ---
app.get('/api/analytics', authenticateToken, async (req: any, res: any) => {
  try {
    const { startDate, endDate, itemId, patientId, status } = req.query;
    
    let whereClause: any = {};
    if (startDate || endDate) {
      whereClause.datePrescribed = {};
      if (startDate) whereClause.datePrescribed.gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        whereClause.datePrescribed.lte = end;
      }
    }
    if (itemId) whereClause.itemId = itemId;
    if (patientId) whereClause.patientId = patientId;
    if (status) whereClause.status = status;

    // We filter totalPatients based on the patientId if provided, else count all
    let totalPatients = 0;
    if (patientId) {
       totalPatients = 1;
    } else {
       totalPatients = await prisma.patient.count();
    }

    const prescriptions = await prisma.prescription.findMany({
      where: whereClause,
      include: {
        item: true,
        patient: true
      }
    });

    let authorizedCount = 0;
    let deniedCount = 0;
    let partialCount = 0;
    
    const itemMap: Record<string, number> = {};
    const patientMap: Record<string, { name: string, total: number }> = {};
    const timeMap: Record<string, number> = {};

    prescriptions.forEach(p => {
      if (p.status === 'AUTHORIZED') authorizedCount++;
      else if (p.status === 'DENIED') deniedCount++;
      else if (p.status === 'PARTIAL') partialCount++;

      // If status is DENIED, use quantityPrescribed for the charts so they aren't empty
      const quantityToSum = p.status === 'DENIED' ? p.quantityPrescribed : p.quantityAuthorized;

      if (quantityToSum > 0) {
        const itemName = p.item.name;
        itemMap[itemName] = (itemMap[itemName] || 0) + quantityToSum;

        const patientName = `${p.patient.lastName} ${p.patient.firstName}`.trim();
        if (!patientMap[patientName]) {
          patientMap[patientName] = { name: patientName, total: 0 };
        }
        patientMap[patientName].total += quantityToSum;

        const d = new Date(p.datePrescribed);
        const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        timeMap[monthStr] = (timeMap[monthStr] || 0) + quantityToSum;
      }
    });

    const itemConsumption = Object.keys(itemMap)
      .map(key => ({ name: key, total: itemMap[key] }))
      .sort((a, b) => b.total - a.total);

    const topPatients = Object.values(patientMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const timeEvolution = Object.keys(timeMap)
      .map(key => ({ date: key, total: timeMap[key] }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      totalPatients,
      statusCounts: {
        AUTHORIZED: authorizedCount,
        PARTIAL: partialCount,
        DENIED: deniedCount
      },
      itemConsumption,
      topPatients,
      timeEvolution
    });
  } catch (err) {
    res.status(500).json({ error: 'Error fetching analytics' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

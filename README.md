# App Auditoría - Control Diabetes & Insumos

Sistema integral para la auditoría, control, trazabilidad y gestión de dispensas de insumos y medicamentos para pacientes diabéticos y tratamientos especiales (Gobierno de Tierra del Fuego).

---

## 🚀 Características Principales

- **Gestión de Pacientes:** Clasificación clínica (Tipo 1, Tipo 2, Niños, Adolescentes, Bomba de Insulina, Cardiópata, Embarazadas).
- **Planilla Virtual (DataGrid):** Matriz histórica estilo Excel con navegación rápida, celdas coloreadas por estado (Aprobado, Tope Mensual, Rechazado) y agrupación de prescripciones.
- **Historial Clínico por Paciente:** Carga ágil de recetas, verificación de topes y dispensas previas con alertas automáticas.
- **Módulo de Estadísticas y Analítica:** Gráficos de consumo por insumo, distribución por estado de autorización y visualización de pacientes con mayor consumo.
- **Control de Acceso y Roles:** Autenticación JWT con roles diferenciados (Administrador y Usuario auditor).
- **Respaldo y Compatibilidad:** Sincronización transparente con base de datos relacional PostgreSQL.

---

## 🛠️ Tecnologías

- **Frontend:** React 18, TypeScript, Vite, Lucide Icons, Recharts, Date-fns, Axios.
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, JSON Web Tokens (JWT), Bcrypt, ExcelJS.
- **Base de Datos:** PostgreSQL 15.
- **Contenedores:** Docker & Docker Compose.

---

## 📂 Estructura del Proyecto

```plaintext
control_diabetes_app/
├── backend/                  # Servidor API REST & Lógica de Negocio
│   ├── prisma/               # Esquema de Prisma y migraciones
│   ├── index.ts              # Endpoints principales y autenticación
│   ├── excelService.ts       # Sincronización y manejo de celdas
│   └── Dockerfile
├── frontend/                 # Interfaz de Usuario Web
│   ├── src/
│   │   ├── pages/            # Dashboard, DataGrid, Analytics, Perfil de Paciente
│   │   ├── api.ts            # Cliente Axios con soporte VITE_API_URL
│   │   └── App.tsx           # Enrutamiento SPA
│   ├── vercel.json           # Reglas de enrutamiento para Vercel
│   └── Dockerfile
├── docker-compose.yml        # Orquestación de servicios en local
└── README.md
```

---

## 💻 Ejecución Local con Docker

Para levantar el entorno completo localmente:

```bash
docker-compose up -d
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3001/api](http://localhost:3001/api)
- **PostgreSQL:** `localhost:5432`

---

## 🌐 Guía de Despliegue en la Nube (24/7 sin depender de la notebook)

### 1. Base de Datos en la Nube (Supabase o Neon)
1. Crea un proyecto gratuito en [Supabase](https://supabase.com) o [Neon](https://neon.tech).
2. Copia la cadena de conexión `DATABASE_URL` (ejemplo: `postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres`).
3. Restaura los datos del backup ejecutando:
   ```bash
   psql "TU_DATABASE_URL_DE_SUPABASE" < backup_diabetes.sql
   ```

### 2. Backend en la Nube (Render o Railway)
1. En [Render](https://render.com), crea un nuevo **Web Service** conectado a este repositorio.
2. Configura los parámetros:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
3. Variables de Entorno en Render:
   - `DATABASE_URL`: La URL copiada de Supabase/Neon.
   - `JWT_SECRET`: Una clave segura para los tokens (ej. `supersecretkey_produccion`).
   - `PORT`: `3001` (o el asignado automáticamente).
4. Copia la URL pública generada (ejemplo: `https://app-auditoria-api.onrender.com`).

### 3. Frontend en Vercel
1. En [Vercel](https://vercel.com), importa el repositorio de GitHub.
2. Configura:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
3. Variable de Entorno en Vercel:
   - `VITE_API_URL`: `https://app-auditoria-api.onrender.com/api` (la URL pública de tu backend con `/api`).
4. Haz clic en **Deploy**.

# App Auditoría - Control Diabetes & Insumos

Sistema integral para la auditoría, control, trazabilidad y gestión de dispensas de insumos y medicamentos para pacientes diabéticos y tratamientos especiales (Gobierno de Tierra del Fuego).

---

## 🚀 Características Principales

- **Gestión de Pacientes:** Clasificación clínica (Tipo 1, Tipo 2, Niños, Adolescentes, Bomba de Insulina, Cardiópata, Embarazadas).
- **Planilla Virtual (DataGrid):** Matriz histórica estilo Excel con navegación rápida, celdas coloreadas por estado (Aprobado, Tope Mensual, Rechazado) y agrupación de prescripciones.
- **Historial Clínico por Paciente:** Carga ágil de recetas, verificación de topes y dispensas previas con alertas automáticas.
- **Módulo de Estadísticas y Analítica:** Gráficos de consumo por insumo, distribución por estado de autorización y visualización de pacientes con mayor consumo.
- **Control de Acceso y Roles:** Autenticación JWT con roles diferenciados (Administrador y Usuario auditor).
- **Respaldo y Compatibilidad:** Base de datos PostgreSQL con auto-inicialización de pacientes históricos y consumos.

---

## 🛠️ Tecnologías

- **Frontend:** React 18, TypeScript, Vite, Lucide Icons, Recharts, Date-fns, Axios.
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, JSON Web Tokens (JWT), Bcrypt, ExcelJS.
- **Base de Datos:** PostgreSQL 15.
- **Contenedores & Despliegue:** Docker, Docker Compose, Render Blueprint (`render.yaml`).

---

## ☁️ Despliegue en la Nube en 1 Solo Entorno (Opción A - Render 24/7)

Todo el sistema (Base de Datos + Servidor API + Web Frontend + Carga automática de los 800 pacientes y 4.998 recetas) está configurado con **Render Blueprint** para desplegarse automáticamente en una sola plataforma:

### Pasos:
1. Inicia sesión en **[dashboard.render.com](https://dashboard.render.com)** con tu cuenta de GitHub.
2. En la esquina superior derecha, haz clic en el botón azul **New +** y selecciona **Blueprint**.
3. Selecciona el repositorio **`workiatdf-glitch/appAuditoria`**.
4. Render detectará automáticamente el archivo `render.yaml` y te mostrará los dos recursos que creará:
   - `app-auditoria-db` (Base de datos PostgreSQL).
   - `app-auditoria` (Servicio Web que compila frontend y backend).
5. Haz clic en **Apply**.
6. Render creará la base de datos, compilará la aplicación y en el primer arranque **cargará automáticamente los 800 pacientes y sus recetas históricas**.
7. Al finalizar, Render te dará un enlace público único (ejemplo: `https://app-auditoria.onrender.com`) para acceder desde cualquier equipo.

---

## 💻 Ejecución Local con Docker

Si deseas seguir usándolo en tu máquina local:

```bash
docker-compose up -d
```

- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:3001/api](http://localhost:3001/api)
- **PostgreSQL:** `localhost:5432`

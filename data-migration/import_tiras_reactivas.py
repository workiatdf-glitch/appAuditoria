import openpyxl
import re
import uuid
import json
import urllib.request
import urllib.error
import sys

def main():
    dry_run = "--dry-run" in sys.argv
    print(f"Iniciando importación de TIRAS REACTIVAS (dry_run={dry_run})...")

    excel_path = "control_diabetes_app/data/data.xlsx"
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    ws = wb["Hoja1"]

    # Cargar mapeo DNI -> patientId desde el backup de D1
    dni_to_patient_id = {}
    with open("control_diabetes_app/backup_live_d1.sql") as f:
        for line in f:
            if line.startswith("INSERT OR REPLACE INTO Patient"):
                parts = line.split("VALUES (")[1].rstrip(");\n").split(", ")
                pid = parts[0].strip("'\"")
                dni = parts[1].strip("'\"")
                dni_to_patient_id[dni] = pid

    item_id = "bdbd7395-008d-4185-a21a-ce8e62427c2a" # TIRAS REACTIVAS DE GLUCOSA
    admin_id = "1a184b67-bf48-4b8d-86f2-5692455b79ae"

    pattern = re.compile(r'\((\d+)\)\s*(\d{1,2}/\d{1,2})')
    date_only_pattern = re.compile(r'^\s*(\d{1,2}/\d{1,2})\s*$')

    prescriptions = []

    for r in range(4, ws.max_row + 1):
        dni = str(ws.cell(row=r, column=2).value or '').strip()
        cell = ws.cell(row=r, column=3)
        val = str(cell.value or '').strip()

        if not val or val.lower() == 'none' or not dni:
            continue

        patient_id = dni_to_patient_id.get(dni)
        if not patient_id:
            print(f"ADVERTENCIA: DNI {dni} en fila {r} no encontrado en base de datos.")
            continue

        fill = cell.fill
        status = 'AUTHORIZED'
        if fill and fill.fgColor:
            try:
                rgb = str(fill.fgColor.rgb or '')
                if 'FF0000' in rgb:
                    status = 'DENIED'
                elif 'FFC0CB' in rgb or 'FF99CC' in rgb:
                    status = 'PARTIAL'
            except Exception:
                pass

        items_in_cell = []
        matches = pattern.findall(val)
        if matches:
            for qty_s, dt_s in matches:
                items_in_cell.append((int(qty_s), dt_s))
        elif date_only_pattern.match(val):
            items_in_cell.append((1, val.strip()))

        for qty, dt_s in items_in_cell:
            d, m = dt_s.split('/')
            date_iso = f"2026-{int(m):02d}-{int(d):02d}T12:00:00.000Z"
            qty_auth = 0 if status == 'DENIED' else qty

            prescriptions.append({
                "id": str(uuid.uuid4()),
                "patientId": patient_id,
                "itemId": item_id,
                "datePrescribed": date_iso,
                "quantityPrescribed": qty,
                "quantityAuthorized": qty_auth,
                "status": status,
                "notes": f"Importación histórica Excel Hoja1 Fila {r}",
                "createdById": admin_id,
                "createdAt": date_iso,
                "updatedAt": date_iso
            })

    print(f"Total registros preparados para importar: {len(prescriptions)}")
    
    # Verificación específica de Silva María Antonella (DNI: 38088396)
    antonella_pid = dni_to_patient_id.get("38088396")
    antonella_recs = [p for p in prescriptions if p["patientId"] == antonella_pid]
    print(f"Registros de SILVA MARIA ANTONELLA: {antonella_recs}")

    if dry_run:
        print("Modo DRY-RUN finalizado. No se enviaron datos a la API.")
        return

    # Envío en lotes de 50 a Cloudflare D1
    api_url = "https://auditoria-promefu.workiatdf.workers.dev/api/admin/import?key=supersecretkey_diabetes"
    chunk_size = 50
    total_chunks = (len(prescriptions) + chunk_size - 1) // chunk_size

    for i in range(0, len(prescriptions), chunk_size):
        chunk = prescriptions[i:i + chunk_size]
        batch_num = (i // chunk_size) + 1
        payload = json.dumps({"prescriptions": chunk}).encode("utf-8")

        req = urllib.request.Request(
            api_url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            }
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_data = json.loads(resp.read().decode("utf-8"))
                if not resp_data.get("success"):
                    print(f"Error en lote {batch_num}/{total_chunks}: {resp_data}")
                    sys.exit(1)
                print(f"Lote {batch_num}/{total_chunks} procesado exitosamente ({len(chunk)} registros).")
        except urllib.error.HTTPError as e:
            print(f"HTTPError en lote {batch_num}: {e.code} - {e.read().decode('utf-8')}")
            sys.exit(1)
        except Exception as e:
            print(f"Error en lote {batch_num}: {e}")
            sys.exit(1)

    print("\n¡IMPORTACIÓN COMPLETADA EXITOSAMENTE!")

if __name__ == "__main__":
    main()

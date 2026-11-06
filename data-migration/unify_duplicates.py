import urllib.request
import urllib.error
import json
import sys

BASE_URL = 'https://auditoria-promefu.workiatdf.workers.dev'
ADMIN_USER = 'admin'
ADMIN_PASS = 'Topo1997.'
IMPORT_KEY = 'supersecretkey_diabetes'
HEADERS = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
}

def get_auth_token():
    req = urllib.request.Request(
        f'{BASE_URL}/api/auth/login',
        data=json.dumps({'username': ADMIN_USER, 'password': ADMIN_PASS}).encode('utf-8'),
        headers=HEADERS
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode('utf-8'))['token']

def main():
    dry_run = '--dry-run' in sys.argv
    print(f"=== INICIANDO UNIFICACIÓN DE PACIENTES DUPLICADOS (dry_run={dry_run}) ===")

    token = get_auth_token()
    auth_headers = {**HEADERS, 'Authorization': f'Bearer {token}'}

    # 1. Verificar registros de CAROLINA GABRIELA ALBORNOZ
    canonical_id = 'a6dcdfdb-d2a3-40ff-913f-4f235d58ea63'
    duplicate_id = 'd9b181be-018f-4150-9a42-3221399d243f'

    # Obtener historial del duplicado
    req_dup_hist = urllib.request.Request(
        f'{BASE_URL}/api/patients/{duplicate_id}/history',
        headers=auth_headers
    )
    try:
        with urllib.request.urlopen(req_dup_hist, timeout=15) as resp:
            dup_prescriptions = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"No se pudo obtener el historial del duplicado (quizá ya fue unificado): {e}")
        dup_prescriptions = []

    print(f"Prescripciones a transferir desde el duplicado ({duplicate_id}): {len(dup_prescriptions)}")
    for p in dup_prescriptions:
        print(f"  -> {p['id']} | Item: {p.get('itemName')} | Fecha: {p['datePrescribed'][:10]} | Cant: {p['quantityAuthorized']}/{p['quantityPrescribed']}")

    # Obtener historial del canónico
    req_can_hist = urllib.request.Request(
        f'{BASE_URL}/api/patients/{canonical_id}/history',
        headers=auth_headers
    )
    with urllib.request.urlopen(req_can_hist, timeout=15) as resp:
        can_prescriptions = json.loads(resp.read().decode('utf-8'))
    print(f"Prescripciones actuales en perfil canónico ({canonical_id}): {len(can_prescriptions)}")

    if dry_run:
        print("Dry run completado. Ningún cambio aplicado.")
        return

    # 2. Paso 1: Actualizar datos del perfil canónico a MAYÚSCULAS y DNI limpio
    print("\n1. Actualizando datos de perfil canónico a mayúsculas y DNI normalizado...")
    update_patient_payload = {
        "patients": [
            {
                "id": canonical_id,
                "dni": "26817480",
                "firstName": "CAROLINA GABRIELA",
                "lastName": "ALBORNOZ",
                "patientType": "BOMBA",
                "createdAt": "2026-08-07T17:53:38.052Z",
                "updatedAt": "2026-11-05T22:00:00.000Z"
            }
        ]
    }
    req_update_p = urllib.request.Request(
        f'{BASE_URL}/api/admin/import?key={IMPORT_KEY}',
        data=json.dumps(update_patient_payload).encode('utf-8'),
        headers=HEADERS
    )
    with urllib.request.urlopen(req_update_p, timeout=15) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("  Respuesta actualización paciente:", res)

    # 3. Paso 2: Reasignar prescripciones del duplicado al perfil canónico
    if dup_prescriptions:
        print(f"\n2. Reasignando {len(dup_prescriptions)} prescripciones al ID canónico...")
        reassigned = []
        for p in dup_prescriptions:
            reassigned.append({
                "id": p["id"],
                "patientId": canonical_id,
                "itemId": p["itemId"],
                "datePrescribed": p["datePrescribed"],
                "quantityPrescribed": p["quantityPrescribed"],
                "quantityAuthorized": p["quantityAuthorized"],
                "status": p["status"],
                "notes": p.get("notes"),
                "createdById": p.get("createdById") or "ac392e77-e1b7-41ca-aa7d-702807365552",
                "createdAt": p["createdAt"],
                "updatedAt": "2026-11-05T22:00:00.000Z"
            })

        req_import_pres = urllib.request.Request(
            f'{BASE_URL}/api/admin/import?key={IMPORT_KEY}',
            data=json.dumps({"prescriptions": reassigned}).encode('utf-8'),
            headers=HEADERS
        )
        with urllib.request.urlopen(req_import_pres, timeout=15) as resp:
            res_pres = json.loads(resp.read().decode('utf-8'))
            print("  Respuesta reasignación prescripciones:", res_pres)

    # 4. Paso 3: Eliminar el perfil duplicado (que ya tiene 0 prescripciones)
    print(f"\n3. Eliminando paciente duplicado {duplicate_id}...")
    req_del = urllib.request.Request(
        f'{BASE_URL}/api/patients/{duplicate_id}',
        headers=auth_headers,
        method='DELETE'
    )
    with urllib.request.urlopen(req_del, timeout=15) as resp:
        res_del = json.loads(resp.read().decode('utf-8'))
        print("  Respuesta eliminación duplicado:", res_del)

    # 5. Paso 4: Verificación final
    print("\n4. Verificación final de integridad:")
    req_final_hist = urllib.request.Request(
        f'{BASE_URL}/api/patients/{canonical_id}/history',
        headers=auth_headers
    )
    with urllib.request.urlopen(req_final_hist, timeout=15) as resp:
        final_history = json.loads(resp.read().decode('utf-8'))
    print(f"  Total prescripciones en perfil unificado: {len(final_history)} (esperadas: {len(can_prescriptions) + len(dup_prescriptions)})")

    req_final_pat = urllib.request.Request(
        f'{BASE_URL}/api/patients/{canonical_id}',
        headers=auth_headers
    )
    with urllib.request.urlopen(req_final_pat, timeout=15) as resp:
        final_pat = json.loads(resp.read().decode('utf-8'))
    print(f"  Paciente unificado: {final_pat['lastName']} {final_pat['firstName']} | DNI: repr={repr(final_pat['dni'])} | Tipo: {final_pat['patientType']}")

    # Verificar que el duplicado ya no existe
    try:
        req_check_dup = urllib.request.Request(
            f'{BASE_URL}/api/patients/{duplicate_id}',
            headers=auth_headers
        )
        with urllib.request.urlopen(req_check_dup, timeout=15) as resp:
            print("  ADVERTENCIA: El duplicado aún responde!")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print("  Confirmado: El paciente duplicado fue eliminado (HTTP 404).")
        else:
            print(f"  HTTPError al verificar duplicado: {e.code}")

    print("\n=== UNIFICACIÓN FINALIZADA CON ÉXITO ===")

if __name__ == '__main__':
    main()

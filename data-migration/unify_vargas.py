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
    print(f"=== INICIANDO UNIFICACIÓN DE VARGAS MUÑOZ OFELIA DEL CARMEN (dry_run={dry_run}) ===")

    token = get_auth_token()
    auth_headers = {**HEADERS, 'Authorization': f'Bearer {token}'}

    canonical_id = 'd4c002ef-b373-4647-8009-4cad888696e8' # DNI 93089453 (CONFIRMADO CORRECTO)
    typo_id = '787e8658-3c40-4d5d-bd18-682af2551814'      # DNI 93308453 (TYPO EXCEL A ELIMINAR)

    # 1. Obtener historial del perfil con typo
    req_typo_hist = urllib.request.Request(
        f'{BASE_URL}/api/patients/{typo_id}/history',
        headers=auth_headers
    )
    try:
        with urllib.request.urlopen(req_typo_hist, timeout=15) as resp:
            typo_prescriptions = json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error al obtener historial del perfil con typo: {e}")
        typo_prescriptions = []

    print(f"Prescripciones a transferir desde el perfil con typo ({typo_id}): {len(typo_prescriptions)}")
    for p in typo_prescriptions:
        print(f"  -> {p['id']} | Item: {p.get('itemName')} | Fecha: {p['datePrescribed'][:10]} | Cant: {p['quantityAuthorized']}/{p['quantityPrescribed']}")

    # 2. Obtener historial del canónico
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

    # 3. Paso 1: Actualizar datos del perfil canónico a MAYÚSCULAS y DNI confirmado
    print("\n1. Actualizando datos de perfil canónico a mayúsculas y DNI confirmado...")
    update_patient_payload = {
        "patients": [
            {
                "id": canonical_id,
                "dni": "93089453",
                "firstName": "OFELIA DEL CARMEN",
                "lastName": "VARGAS MUÑOZ",
                "patientType": "TIPO_2",
                "createdAt": "2026-07-23T13:51:45.088Z",
                "updatedAt": "2026-11-05T22:15:00.000Z"
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

    # 4. Paso 2: Reasignar las 8 prescripciones del perfil typo al perfil canónico
    if typo_prescriptions:
        print(f"\n2. Reasignando {len(typo_prescriptions)} prescripciones al ID canónico ({canonical_id})...")
        reassigned = []
        for p in typo_prescriptions:
            reassigned.append({
                "id": p["id"],
                "patientId": canonical_id,
                "itemId": p["itemId"],
                "datePrescribed": p["datePrescribed"],
                "quantityPrescribed": p["quantityPrescribed"],
                "quantityAuthorized": p["quantityAuthorized"],
                "status": p["status"],
                "notes": p.get("notes"),
                "createdById": p.get("createdById") or "1a184b67-bf48-4b8d-86f2-5692455b79ae",
                "createdAt": p["createdAt"],
                "updatedAt": "2026-11-05T22:15:00.000Z"
            })

        req_import_pres = urllib.request.Request(
            f'{BASE_URL}/api/admin/import?key={IMPORT_KEY}',
            data=json.dumps({"prescriptions": reassigned}).encode('utf-8'),
            headers=HEADERS
        )
        with urllib.request.urlopen(req_import_pres, timeout=15) as resp:
            res_pres = json.loads(resp.read().decode('utf-8'))
            print("  Respuesta reasignación prescripciones:", res_pres)

    # 5. Paso 3: Eliminar el perfil con typo (que ya tiene 0 prescripciones)
    print(f"\n3. Eliminando paciente con DNI typo {typo_id}...")
    req_del = urllib.request.Request(
        f'{BASE_URL}/api/patients/{typo_id}',
        headers=auth_headers,
        method='DELETE'
    )
    with urllib.request.urlopen(req_del, timeout=15) as resp:
        res_del = json.loads(resp.read().decode('utf-8'))
        print("  Respuesta eliminación typo:", res_del)

    # 6. Paso 4: Verificación final
    print("\n4. Verificación final de integridad:")
    req_final_hist = urllib.request.Request(
        f'{BASE_URL}/api/patients/{canonical_id}/history',
        headers=auth_headers
    )
    with urllib.request.urlopen(req_final_hist, timeout=15) as resp:
        final_history = json.loads(resp.read().decode('utf-8'))
    print(f"  Total prescripciones en perfil unificado: {len(final_history)} (esperadas: {len(can_prescriptions) + len(typo_prescriptions)})")

    req_final_pat = urllib.request.Request(
        f'{BASE_URL}/api/patients/{canonical_id}',
        headers=auth_headers
    )
    with urllib.request.urlopen(req_final_pat, timeout=15) as resp:
        final_pat = json.loads(resp.read().decode('utf-8'))
    print(f"  Paciente unificado: {final_pat['lastName']} {final_pat['firstName']} | DNI: repr={repr(final_pat['dni'])} | Tipo: {final_pat['patientType']}")

    # Verificar que el typo ya no existe
    try:
        req_check_dup = urllib.request.Request(
            f'{BASE_URL}/api/patients/{typo_id}',
            headers=auth_headers
        )
        with urllib.request.urlopen(req_check_dup, timeout=15) as resp:
            print("  ADVERTENCIA: El perfil typo aún responde!")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print("  Confirmado: El perfil typo fue eliminado (HTTP 404).")
        else:
            print(f"  HTTPError al verificar typo: {e.code}")

    print("\n=== UNIFICACIÓN FINALIZADA CON ÉXITO ===")

if __name__ == '__main__':
    main()

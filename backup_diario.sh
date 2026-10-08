#!/bin/bash
# ==============================================================================
# Script de Respaldo Diario Automático - Control Auditoría Diabetes
# Hora programada: 03:00 AM (Argentina / Tierra del Fuego)
# Genera copias en SQL (SQLite nativo D1) y Excel (.xls con todas las hojas)
# ==============================================================================

set -e

FECHA=$(date +"%Y-%m-%d")
DIR_LOCAL="/Users/drpadrino/Documents/WorkIaTdf/backups_diabetes"
mkdir -p "$DIR_LOCAL"

# Directorio en OneDrive (Gobierno de Tierra del Fuego) si está montado
DIR_ONEDRIVE="/Users/drpadrino/Library/CloudStorage/OneDrive-GOBIERNODETIERRADELFUEGO/Backups_Control_Diabetes"
if [ -d "/Users/drpadrino/Library/CloudStorage/OneDrive-GOBIERNODETIERRADELFUEGO" ]; then
    mkdir -p "$DIR_ONEDRIVE" 2>/dev/null || true
fi

LOG_FILE="$DIR_LOCAL/backup.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando respaldo diario de Control Diabetes..." >> "$LOG_FILE"

API_URL="https://auditoria-promefu.workiatdf.workers.dev/api/admin/backup"
API_KEY="supersecretkey_diabetes"

FILE_SQL="$DIR_LOCAL/backup_diabetes_${FECHA}.sql"
FILE_XLS="$DIR_LOCAL/backup_diabetes_${FECHA}.xls"

# 1. Descargar respaldo SQL
HTTP_SQL=$(curl -s -w "%{http_code}" -o "$FILE_SQL" "${API_URL}?format=sql&key=${API_KEY}")
if [ "$HTTP_SQL" = "200" ] && [ -s "$FILE_SQL" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Respaldo SQL generado: $FILE_SQL ($(du -h "$FILE_SQL" | cut -f1))" >> "$LOG_FILE"
    if [ -d "$DIR_ONEDRIVE" ]; then
        cp "$FILE_SQL" "$DIR_ONEDRIVE/" 2>/dev/null || true
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Copiado a OneDrive: $DIR_ONEDRIVE/backup_diabetes_${FECHA}.sql" >> "$LOG_FILE"
    fi
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR al generar respaldo SQL (HTTP $HTTP_SQL)" >> "$LOG_FILE"
fi

# 2. Descargar respaldo Excel (.xls)
HTTP_XLS=$(curl -s -w "%{http_code}" -o "$FILE_XLS" "${API_URL}?format=excel&key=${API_KEY}")
if [ "$HTTP_XLS" = "200" ] && [ -s "$FILE_XLS" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Respaldo Excel generado: $FILE_XLS ($(du -h "$FILE_XLS" | cut -f1))" >> "$LOG_FILE"
    if [ -d "$DIR_ONEDRIVE" ]; then
        cp "$FILE_XLS" "$DIR_ONEDRIVE/" 2>/dev/null || true
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Copiado a OneDrive: $DIR_ONEDRIVE/backup_diabetes_${FECHA}.xls" >> "$LOG_FILE"
    fi
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR al generar respaldo Excel (HTTP $HTTP_XLS)" >> "$LOG_FILE"
fi

# 3. Mantener limpios respaldos viejos (conservar los últimos 60 días)
find "$DIR_LOCAL" -name "backup_diabetes_*.sql" -mtime +60 -delete 2>/dev/null || true
find "$DIR_LOCAL" -name "backup_diabetes_*.xls" -mtime +60 -delete 2>/dev/null || true

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Respaldo diario finalizado exitosamente." >> "$LOG_FILE"

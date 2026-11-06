# Sobreescritura segura de datos actualizados

> Regla de oro: **nunca se escribe encima de un dato sin validar,
> sin backup y sin verificar después.** Si algo falla, la DB y el
> JSON anteriores siguen intactos y se restauran desde el backup.

## Flujo recomendado

```bash
# 1. Validar el archivo nuevo (sin escribir nada)
python3 tools/safe_overwrite.py validate --file /tmp/nuevo_leg66.json

# 2. Simular la sobreescritura del JSON (dry-run)
python3 tools/safe_overwrite.py json --src /tmp/nuevo_leg66.json \
    --dest storage/data/json/congreso_union_leg_66.json --dry-run

# 3. Sobreescribir el JSON (crea backup en storage/data/backup/)
python3 tools/safe_overwrite.py json --src /tmp/nuevo_leg66.json \
    --dest storage/data/json/congreso_union_leg_66.json

# 4. Reconstruir la DB con guardas (backup en storage/backup/,
#    aborta si el total cae mas del 5% o baja de 15,000)
python3 tools/build_mobile_db.py

# 5. Verificar el conteo (referencia: 16,136 actores)
python3 -c "import sqlite3; print(sqlite3.connect('storage/tlatoa.db').execute('SELECT COUNT(*) FROM politicos').fetchone()[0])"

# 6. Reiniciar la web, porque app/services/data_service.py carga
#    los JSON solo al arrancar (no hay recarga en caliente).
```

Para un cambio puntual en la DB sin reconstruirla entera:

```bash
python3 tools/safe_overwrite.py db --db storage/tlatoa.db \
    --records /tmp/registros_actualizados.json --dry-run
python3 tools/safe_overwrite.py db --db storage/tlatoa.db \
    --records /tmp/registros_actualizados.json
```

## Qué protege cada paso

| Riesgo anterior | Protección ahora |
|---|---|
| JSON inválido que el builder omitía en silencio | `validate_dataset()` rechaza antes de escribir; el original queda intacto |
| Fecha vieja que pisaba una nueva | Se rechaza si la fecha nueva < existente, salvo `--force` justificado |
| Sin backup antes de reemplazar | Backup con SHA-256 en `storage/data/backup/` (JSON) y `storage/backup/` (DB), con `manifest.json` |
| Escritura parcial si se corta el proceso | Temporal en el mismo directorio + `fsync` + `os.replace` + relectura |
| DB nueva con menos actores que la vieja | `--allow-drop-pct` (5%) y `--min-total` (15,000) abortan antes del replace |
| DB corrupta tras el rebuild | `PRAGMA integrity_check` y prueba FTS5 (`MATCH 'lopez' > 0`) sobre el temporal |
| Duplicado por slug | `INSERT ... ON CONFLICT(slug) DO UPDATE` actualiza en vez de duplicar |
| Contraste: se borraba la DB antes de reconstruir | `build_contraste_db.py` ahora construye en temporal, verifica y luego reemplaza |

## Qué hacer si algo falla

1. **No se escribió nada:** si `validate` o el `--dry-run` fallan,
   no hay nada que restaurar. Corrige el archivo nuevo y repite.
2. **JSON sobrescrito y es el incorrecto:** restaura desde
   `storage/data/backup/<nombre>.<fecha>.json` con
   `python3 tools/safe_overwrite.py json --src <backup> --dest <destino> --force`
   y reconstruye la DB.
3. **DB nueva con menos actores:** el builder ya abortó y la vieja
   sigue en `storage/tlatoa.db`. Si aun así necesitas volver atrás,
   copia el backup de `storage/backup/tlatoa.db.<fecha>` sobre
   `storage/tlatoa.db` y reinicia la web.
4. **La web no refleja el cambio:** reiníciala; `data_service.py`
   carga los JSON al arrancar. La app Android/Desktop usa `tlatoa.db`,
   no los JSON: hay que redistribuir la DB reconstruida.

## Límites conocidos

- La fecha se compara por dataset (fecha máxima), no por registro
  individual en `overwrite_json`; el upsert de DB sí compara por slug.
- `build_mobile_db.py` sigue descartando duplicados por slug con el
  criterio "el primero gana" por legislatura descendente; un registro
  nuevo no sustituye a uno viejo si su slug ya apareció en una
  legislatura más reciente. Usa `safe_overwrite.py db` para ese caso.
- Los backups son locales y están en `.gitignore`: no se commitean.

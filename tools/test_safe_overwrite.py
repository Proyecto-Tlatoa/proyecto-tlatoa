#!/usr/bin/env python3
"""Tests de tools/safe_overwrite.py y de las guardas de build_mobile_db.py.

Solo biblioteca estandar (unittest). No toca los datos canonicos:
todo se hace en directorios temporales. Uso:
    python3 -m unittest tools.test_safe_overwrite -v
    python3 tools/test_safe_overwrite.py
"""
import json
import os
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import safe_overwrite as so
from build_mobile_db import check_counts, historical_local_files, is_federal_executive

LEGISLADOR = {
    "referencia_sil": "1", "nombre_completo": "Perez Lopez Ana",
    "camara": "Diputados", "legislatura": 66, "partido": "MORENA",
    "principio_eleccion": "Mayoria relativa", "entidad": "Jalisco",
    "metadata": {"fuente_url": "https://sil.gobernacion.gob.mx/",
                 "fecha_extraccion": "2026-10-09"},
}


def dataset_legisladores(fecha, nombre="Perez Lopez Ana", partido="MORENA"):
    rec = dict(LEGISLADOR)
    rec["nombre_completo"] = nombre
    rec["partido"] = partido
    rec["metadata"] = {"fuente_url": "https://sil.gobernacion.gob.mx/",
                       "fecha_extraccion": fecha}
    return {"metadata": {"generado_en": fecha, "total_diputados": 1},
            "diputados": [rec], "senadores": []}


def write_json(path, data):
    Path(path).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return Path(path)


class SafeOverwriteTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self._orig_json_backup = so.JSON_BACKUP_DIR
        self._orig_db_backup = so.DB_BACKUP_DIR
        so.JSON_BACKUP_DIR = self.root / "json_backup"
        so.DB_BACKUP_DIR = self.root / "db_backup"

    def tearDown(self):
        so.JSON_BACKUP_DIR = self._orig_json_backup
        so.DB_BACKUP_DIR = self._orig_db_backup
        self.tmp.cleanup()

    def test_overwrite_valido_funciona_y_hace_backup(self):
        dest = write_json(self.root / "dest.json", dataset_legisladores("2026-10-09"))
        src = write_json(self.root / "src.json", dataset_legisladores("2026-11-05", partido="PAN"))
        result = so.overwrite_json(src, dest)
        self.assertFalse(result["dry_run"])
        self.assertIsNotNone(result["backup"])
        self.assertTrue(Path(result["backup"]).exists())
        self.assertTrue((so.JSON_BACKUP_DIR / "manifest.json").exists())
        final = json.loads(dest.read_text(encoding="utf-8"))
        self.assertEqual(final["diputados"][0]["partido"], "PAN")
        self.assertEqual(final["diputados"][0]["metadata"]["fecha_extraccion"], "2026-11-05")

    def test_dry_run_no_escribe_nada(self):
        dest = write_json(self.root / "dest.json", dataset_legisladores("2026-10-09"))
        src = write_json(self.root / "src.json", dataset_legisladores("2026-11-05"))
        before = dest.read_bytes()
        result = so.overwrite_json(src, dest, dry_run=True)
        self.assertTrue(result["dry_run"])
        self.assertEqual(dest.read_bytes(), before)
        self.assertFalse(so.JSON_BACKUP_DIR.exists())

    def test_json_corrupto_se_rechaza_y_original_intacto(self):
        dest = write_json(self.root / "dest.json", dataset_legisladores("2026-10-09"))
        before = dest.read_bytes()
        src = self.root / "src.json"
        src.write_bytes(b"{ JSON INVALIDO")
        with self.assertRaises(ValueError):
            so.overwrite_json(src, dest)
        self.assertEqual(dest.read_bytes(), before)
        self.assertFalse(so.JSON_BACKUP_DIR.exists())

    def test_fecha_anterior_se_rechaza_sin_force(self):
        dest = write_json(self.root / "dest.json", dataset_legisladores("2026-11-05"))
        src = write_json(self.root / "src.json", dataset_legisladores("2026-10-09"))
        with self.assertRaises(ValueError):
            so.overwrite_json(src, dest)
        self.assertEqual(json.loads(dest.read_text(encoding="utf-8"))["diputados"][0]["metadata"]["fecha_extraccion"], "2026-11-05")
        result = so.overwrite_json(src, dest, force=True)
        self.assertEqual(json.loads(dest.read_text(encoding="utf-8"))["diputados"][0]["metadata"]["fecha_extraccion"], "2026-10-09")
        self.assertIsNotNone(result["backup"])

    def test_dato_personal_se_rechaza(self):
        data = dataset_legisladores("2026-11-05")
        data["diputados"][0]["curp"] = "XXXX000000XXXXXX00"
        src = write_json(self.root / "src.json", data)
        dest = self.root / "dest.json"
        with self.assertRaises(ValueError):
            so.overwrite_json(src, dest)
        self.assertFalse(dest.exists())

    def test_bom_se_rechaza(self):
        src = self.root / "src.json"
        src.write_bytes(b"\xef\xbb\xbf" + json.dumps(dataset_legisladores("2026-11-05")).encode("utf-8"))
        with self.assertRaises(ValueError):
            so.overwrite_json(src, self.root / "dest.json")

    def test_escritura_atomica_no_deja_parcial(self):
        dest = self.root / "sub" / "dest.json"
        so.atomic_write(dest, b'{"a": 1}')
        so.atomic_write(dest, b'{"a": 2}')
        self.assertEqual(dest.read_bytes(), b'{"a": 2}')
        leftovers = list(dest.parent.glob(".*.tmp-*"))
        self.assertEqual(leftovers, [])


def make_test_db(path):
    conn = sqlite3.connect(path)
    conn.execute("""CREATE TABLE politicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT UNIQUE NOT NULL,
        nombre_completo TEXT NOT NULL, partido TEXT NOT NULL,
        partido_color TEXT NOT NULL, cargo TEXT NOT NULL, camara TEXT NOT NULL,
        entidad TEXT NOT NULL, es_activo INTEGER NOT NULL DEFAULT 1,
        foto_url TEXT, datos_json TEXT NOT NULL)""")
    conn.execute("""CREATE VIRTUAL TABLE politicos_fts USING fts5(
        slug UNINDEXED, nombre, partido, cargo, entidad,
        tokenize = 'unicode61 remove_diacritics 2')""")
    conn.commit()
    return conn


def contraste_records(fecha, nombre="Perez Lopez Ana", partido="MORENA"):
    return {"lote": "prueba", "fecha_contraste": fecha, "corte_frescura": "2026-10-05",
            "registros": [{"nombre_completo": nombre, "cargo": "Diputada Federal",
                           "partido": partido, "camara": "Diputados",
                           "entidad": "Jalisco", "dato_contrastado": "partido",
                           "valor_oficial": partido, "fecha_oficial": fecha,
                           "fuente_oficial_url": "https://sil.gobernacion.gob.mx/",
                           "estado_frescura": "[Fuente Actualizada No Oficial]",
                           "fuente_actualizada_no_oficial": None,
                           "fuente_desactualizada": False,
                           "fecha_contraste": fecha, "notas": "prueba"}]}


class UpsertDbTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self._orig_db_backup = so.DB_BACKUP_DIR
        so.DB_BACKUP_DIR = self.root / "db_backup"
        self.db = self.root / "test.db"
        make_test_db(self.db).close()

    def tearDown(self):
        so.DB_BACKUP_DIR = self._orig_db_backup
        self.tmp.cleanup()

    def _count(self, table="politicos"):
        conn = sqlite3.connect(self.db)
        try:
            return conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        finally:
            conn.close()

    def test_slug_duplicado_actualiza_en_vez_de_duplicar(self):
        recs = write_json(self.root / "r.json", contraste_records("2026-11-05"))
        first = so.upsert_db(self.db, recs)
        self.assertEqual((first["insertados"], first["actualizados"]), (1, 0))
        self.assertEqual(self._count(), 1)
        recs2 = write_json(self.root / "r2.json", contraste_records("2026-11-05", partido="PAN"))
        second = so.upsert_db(self.db, recs2)
        self.assertEqual((second["insertados"], second["actualizados"]), (0, 1))
        self.assertEqual(self._count(), 1)
        self.assertEqual(self._count("politicos_fts"), 1)
        conn = sqlite3.connect(self.db)
        row = conn.execute("SELECT partido FROM politicos").fetchone()
        conn.close()
        self.assertEqual(row[0], "PAN")

    def test_upsert_fecha_anterior_no_sobrescribe(self):
        recs = write_json(self.root / "r.json", contraste_records("2026-11-05", partido="PAN"))
        so.upsert_db(self.db, recs)
        old = write_json(self.root / "r2.json", contraste_records("2026-10-01", partido="PRI"))
        result = so.upsert_db(self.db, old)
        self.assertEqual(result["omitidos_por_fecha"], 1)
        conn = sqlite3.connect(self.db)
        row = conn.execute("SELECT partido FROM politicos").fetchone()
        conn.close()
        self.assertEqual(row[0], "PAN")

    def test_upsert_hace_backup_e_integrity_ok(self):
        recs = write_json(self.root / "r.json", contraste_records("2026-11-05"))
        result = so.upsert_db(self.db, recs)
        self.assertTrue(Path(result["backup"]).exists())
        conn = sqlite3.connect(self.db)
        self.assertEqual(conn.execute("PRAGMA integrity_check").fetchone()[0], "ok")
        conn.close()

    def test_upsert_dry_run_no_escribe(self):
        recs = write_json(self.root / "r.json", contraste_records("2026-11-05"))
        result = so.upsert_db(self.db, recs, dry_run=True)
        self.assertTrue(result["dry_run"])
        self.assertEqual(self._count(), 0)
        self.assertFalse(so.DB_BACKUP_DIR.exists())


class GuardTests(unittest.TestCase):
    def test_caida_por_encima_del_umbral_aborta(self):
        with self.assertRaises(SystemExit):
            check_counts(16136, 15000, allow_drop_pct=5.0, min_total=15000)
        with self.assertRaises(SystemExit):
            check_counts(16136, 14000, allow_drop_pct=50.0, min_total=15000)

    def test_caida_dentro_del_umbral_pasa(self):
        self.assertTrue(check_counts(16136, 16000, allow_drop_pct=5.0, min_total=15000))
        self.assertTrue(check_counts(None, 16136, allow_drop_pct=5.0, min_total=15000))
        self.assertTrue(check_counts(16136, 16136, allow_drop_pct=5.0, min_total=15000))


class PresidenciaTests(unittest.TestCase):
    def test_presidencia_es_federal_y_gobernador_no(self):
        self.assertTrue(is_federal_executive(
            Path("presidencia_mexico.json"), {"nivel": "federal"}))
        self.assertTrue(is_federal_executive(
            Path("presidencia_mexico.json"), {}))
        self.assertFalse(is_federal_executive(
            Path("gobernadores_jalisco.json"), {"entidad": "Jalisco"}))

    def test_presidencia_json_valida_y_sheinbaum_vigente(self):
        path = Path(__file__).resolve().parent.parent / "storage" / "data" / "json" / "ejecutivo" / "presidencia_mexico.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(so.validate_dataset(data, str(path)), [])
        mans = {m["nombre_completo"]: m for m in data["mandatarios"]}
        sheinbaum = mans["Claudia Sheinbaum Pardo"]
        self.assertTrue(sheinbaum["es_vigente"])
        self.assertEqual(sheinbaum["fecha_inicio"], "2024-10-01")
        self.assertEqual(sheinbaum["fecha_conclusion"], "2030-09-30")
        self.assertEqual(sheinbaum["partido"], "MORENA")
        self.assertEqual(mans["Andrés Manuel López Obrador"]["es_vigente"], False)
        self.assertEqual(
            sheinbaum["trayectoria_administrativa"][0]["cargo"],
            "Jefa de Gobierno de la Ciudad de México")


class EsActivoLocalTests(unittest.TestCase):
    def test_aldf_leg7_es_historico_y_no_vigente(self):
        hist = historical_local_files()
        self.assertIn("json/congreso_cdmx_aldf_leg_7.json", hist)
        self.assertNotIn("json/congreso_cdmx_leg_3.json", hist)

    def test_archivos_locales_vigentes_son_36(self):
        hist = historical_local_files()
        base = Path(__file__).resolve().parent.parent / "storage" / "data" / "json"
        vigentes = [p for p in base.glob("congreso_*_leg_*.json")
                    if not p.name.startswith("congreso_union_")
                    and f"json/{p.name}" not in hist]
        self.assertEqual(len(vigentes), 36)

    def test_diputados_vigentes_unicos_son_1122(self):
        hist = historical_local_files()
        base = Path(__file__).resolve().parent.parent / "storage" / "data" / "json"
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from build_mobile_db import slugify
        seen = set()
        for p in base.glob("congreso_*_leg_*.json"):
            if p.name.startswith("congreso_union_"):
                continue
            if f"json/{p.name}" in hist:
                continue
            data = json.loads(p.read_text(encoding="utf-8"))
            lst = data.get("legisladores") or data.get("diputados") or []
            for d in lst:
                seen.add(d.get("slug") or slugify(d.get("nombre_completo") or ""))
        self.assertEqual(len(seen), 1122)


if __name__ == "__main__":
    unittest.main(verbosity=2)

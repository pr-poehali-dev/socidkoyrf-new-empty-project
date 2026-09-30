CREATE TABLE IF NOT EXISTS nom_suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nom_uploads (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES nom_suppliers(id),
  supplier_name TEXT,
  file_name TEXT,
  rows_total INTEGER NOT NULL DEFAULT 0,
  created_new INTEGER NOT NULL DEFAULT 0,
  updated_existing INTEGER NOT NULL DEFAULT 0,
  skipped INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'черновик',
  mapping JSONB,
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_nom_uploads_created ON nom_uploads(created_at DESC);

CREATE TABLE IF NOT EXISTS nom_upload_rows (
  id SERIAL PRIMARY KEY,
  upload_id INTEGER NOT NULL REFERENCES nom_uploads(id),
  row_num INTEGER,
  raw_name TEXT,
  raw_article TEXT,
  verdict TEXT,
  nomenclature_id INTEGER REFERENCES nomenclature(id),
  problem TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nom_upload_rows_upload ON nom_upload_rows(upload_id);

CREATE TABLE IF NOT EXISTS nom_groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nom_brands (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nom_features (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nomenclature (
  id SERIAL PRIMARY KEY,
  group_id INTEGER REFERENCES nom_groups(id),
  brand_id INTEGER REFERENCES nom_brands(id),
  model TEXT,
  article TEXT,
  article_norm TEXT,
  weight NUMERIC(12,3),
  volume NUMERIC(12,3),
  created_by INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  upload_id INTEGER,
  ext_1c_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_nomenclature_brand ON nomenclature(brand_id);
CREATE INDEX IF NOT EXISTS idx_nomenclature_group ON nomenclature(group_id);
CREATE INDEX IF NOT EXISTS idx_nomenclature_article_norm ON nomenclature(article_norm);
CREATE INDEX IF NOT EXISTS idx_nomenclature_model ON nomenclature(model);

CREATE TABLE IF NOT EXISTS nomenclature_features (
  nomenclature_id INTEGER NOT NULL REFERENCES nomenclature(id),
  feature_id INTEGER NOT NULL REFERENCES nom_features(id),
  PRIMARY KEY (nomenclature_id, feature_id)
);

CREATE TABLE IF NOT EXISTS nomenclature_supplier_names (
  id SERIAL PRIMARY KEY,
  nomenclature_id INTEGER NOT NULL REFERENCES nomenclature(id),
  supplier_id INTEGER,
  supplier_name TEXT,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nom_sup_names_nom ON nomenclature_supplier_names(nomenclature_id);

CREATE TABLE IF NOT EXISTS nomenclature_supplier_articles (
  id SERIAL PRIMARY KEY,
  nomenclature_id INTEGER NOT NULL REFERENCES nomenclature(id),
  supplier_id INTEGER,
  supplier_name TEXT,
  article TEXT NOT NULL,
  article_norm TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nom_sup_art_nom ON nomenclature_supplier_articles(nomenclature_id);
CREATE INDEX IF NOT EXISTS idx_nom_sup_art_norm ON nomenclature_supplier_articles(article_norm);

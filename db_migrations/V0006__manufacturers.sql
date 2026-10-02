ALTER TABLE nom_suppliers RENAME TO nom_manufacturers;
ALTER TABLE nom_manufacturers ADD COLUMN IF NOT EXISTS inn TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_nom_manufacturers_inn ON nom_manufacturers(inn) WHERE inn IS NOT NULL;
ALTER TABLE nom_brands ADD COLUMN IF NOT EXISTS manufacturer_id INTEGER REFERENCES nom_manufacturers(id);
CREATE INDEX IF NOT EXISTS idx_nom_brands_manufacturer ON nom_brands(manufacturer_id);

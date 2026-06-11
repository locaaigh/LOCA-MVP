// ─────────────────────────────────────────────────────────────
// Importación de productos/servicios desde CSV (XLSX preparado).
// Parser propio (sin dependencias) que maneja comillas y comas.
// ─────────────────────────────────────────────────────────────
import type { ProductService, ProductServiceType } from "./types";
import { uid } from "./utils";

// Columnas estándar aceptadas (también se aceptan variantes en español).
const COLUMN_ALIASES: Record<string, string> = {
  name: "name",
  nombre: "name",
  type: "type",
  tipo: "type",
  category: "category",
  categoria: "category",
  categoría: "category",
  shortdescription: "shortDescription",
  descripcioncorta: "shortDescription",
  "descripcion corta": "shortDescription",
  longdescription: "longDescription",
  descripcionlarga: "longDescription",
  price: "price",
  precio: "price",
  currency: "currency",
  moneda: "currency",
  keywords: "keywords",
  "palabras clave": "keywords",
};

export interface CsvImportResult {
  items: ProductService[];
  errors: string[];
  rawRows: Record<string, string>[];
}

// Parsea una línea CSV respetando comillas dobles.
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function normalizeType(v: string): ProductServiceType {
  const t = (v || "").toLowerCase();
  if (t.startsWith("serv")) return "servicio";
  return "producto";
}

export function parseProductsCsv(text: string): CsvImportResult {
  const errors: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { items: [], errors: ["El archivo no tiene filas de datos."], rawRows: [] };
  }

  const headerCells = parseLine(lines[0]).map((h) =>
    COLUMN_ALIASES[h.toLowerCase().trim()] || h.toLowerCase().trim()
  );
  if (!headerCells.includes("name")) {
    errors.push('No se encontró la columna "name" (o "nombre"). Es obligatoria.');
  }

  const rawRows: Record<string, string>[] = [];
  const items: ProductService[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    const row: Record<string, string> = {};
    headerCells.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rawRows.push(row);

    if (!row.name) {
      errors.push(`Fila ${i + 1}: sin nombre, se ignoró.`);
      continue;
    }
    const price = row.price ? Number(String(row.price).replace(/[^\d.]/g, "")) : undefined;
    items.push({
      id: uid("ps"),
      type: normalizeType(row.type),
      name: row.name,
      category: row.category || "",
      subcategory: "",
      shortDescription: row.shortDescription || "",
      longDescription: row.longDescription || "",
      features: [],
      variants: [],
      pricingType: "fijo",
      currency: row.currency || "ARS",
      priceMin: Number.isFinite(price) ? price : undefined,
      priceMax: undefined,
      imageCaption: "",
      keywords: row.keywords ? row.keywords.split(/[;|]/).map((k) => k.trim()).filter(Boolean) : [],
      negativeKeywords: [],
      isTopSeller: false,
      saved: true,
      importSource: "csv",
    });
  }

  return { items, errors, rawRows };
}

// XLSX: preparado para el futuro. Hoy avisamos amablemente.
export function parseProductsXlsx(_buf: ArrayBuffer): CsvImportResult {
  return {
    items: [],
    errors: [
      "Por ahora soportamos CSV. Exportá tu Excel como .csv (Archivo → Guardar como → CSV) y subilo.",
    ],
    rawRows: [],
  };
}

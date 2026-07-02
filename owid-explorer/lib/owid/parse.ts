import type { DataRow, EntitySeries, ParsedChartData } from "./types";

// Minimal RFC 4180 CSV parser — OWID entity names can contain commas/quotes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += c;
        i++;
      }
    } else if (c === '"') {
      inQuotes = true;
      i++;
    } else if (c === ",") {
      row.push(field);
      field = "";
      i++;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i++;
    } else {
      field += c;
      i++;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// OWID chart CSV -> typed rows. Header: entity,code,year,<value columns...>
// Some charts carry non-numeric columns (e.g. owid_region: "Asia") — these are
// detected from the data and excluded from `columns` and `values`.
export function parseChartCsv(text: string): ParsedChartData {
  const raw = parseCsv(text.trim());
  if (raw.length === 0) return { columns: [], rows: [] };

  const header = raw[0];
  const allColumns = header.slice(3);
  const body = raw.slice(1);

  const isNumeric = allColumns.map((_, idx) =>
    body.some((r) => {
      const cell = r[3 + idx];
      return cell !== "" && cell !== undefined && Number.isFinite(Number(cell));
    })
  );
  const valueColumns = allColumns.filter((_, idx) => isNumeric[idx]);

  const rows: DataRow[] = [];
  for (const r of body) {
    if (r.length < 3) continue;
    const year = Number(r[2]);
    if (!Number.isFinite(year)) continue;
    const values: Record<string, number | null> = {};
    allColumns.forEach((col, idx) => {
      if (!isNumeric[idx]) return;
      const cell = r[3 + idx];
      const n = cell === "" || cell === undefined ? null : Number(cell);
      values[col] = n !== null && Number.isFinite(n) ? n : null;
    });
    rows.push({ entity: r[0], code: r[1], year, values });
  }

  return { columns: valueColumns, rows };
}

// Group one value column into per-entity line series, sorted by year.
// Null values become gaps (omitted points) — never interpolated (SPEC.md §4).
export function toEntitySeries(data: ParsedChartData, column: string): EntitySeries[] {
  const byCode = new Map<string, EntitySeries>();
  for (const row of data.rows) {
    const v = row.values[column];
    if (v === null || v === undefined || !Number.isFinite(v)) continue;
    const key = row.code || row.entity;
    let s = byCode.get(key);
    if (!s) {
      s = { entity: row.entity, code: row.code, points: [] };
      byCode.set(key, s);
    }
    s.points.push([row.year, v]);
  }
  const series = [...byCode.values()];
  for (const s of series) s.points.sort((a, b) => a[0] - b[0]);
  series.sort((a, b) => a.entity.localeCompare(b.entity));
  return series;
}

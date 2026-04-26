#!/usr/bin/env node

/**
 * Converts habit tracking CSV data to yearly JSON files.
 *
 * Usage:
 *   node scripts/convert-habits-csv.mjs <input.csv>
 *
 * Output:
 *   public/data/habits-{year}.json (one file per year found in data)
 *
 * Expected CSV columns (others will be ignored):
 *   - Timestamp: Date in M/D/YYYY format
 *   - Sleep quality: 1-5 rating
 *   - Workout: Categorical (e.g., "Gym", "Run", "No")
 *   - Coffee count: Number
 *   - Meditation?: Yes/No
 *   - Bedtime reading?: Yes/No
 *   - Olive oil?: Yes/No
 *   - Shower: Categorical (e.g., "Cold", "Hot", "Both")
 *   - Alcohol: Yes/No
 *   - Phone time: Minutes
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Column name mappings (alternate names -> canonical names)
const COLUMN_ALIASES = {
  "Date": "Timestamp",
  "Timestamp": "Timestamp",
  "Sleep quality": "Sleep quality",
  "Sleep score": "Sleep quality",
  "Workout": "Workout",
  "Coffee count": "Coffee count",
  "Coffee": "Coffee count",
  "Meditation?": "Meditation?",
  "Medditation": "Meditation?",
  "Bedtime reading?": "Bedtime reading?",
  "Bedtime reading": "Bedtime reading?",
  "Olive oil?": "Olive oil?",
  "Olive Oil": "Olive oil?",
  "Shower": "Shower",
  "Alcohol": "Alcohol",
  "Phone time": "Phone time",
};

// Columns to keep (canonical names)
const COLUMNS_TO_KEEP = [
  "Timestamp",
  "Sleep quality",
  "Workout",
  "Coffee count",
  "Meditation?",
  "Bedtime reading?",
  "Olive oil?",
  "Shower",
  "Alcohol",
  "Phone time",
];

function parseCSV(content) {
  let lines = content.trim().split("\n");
  // Skip leading empty or all-comma rows (Google Sheets export artifact)
  while (lines.length > 0 && lines[0].replace(/[,\s]/g, "") === "") {
    lines = lines.slice(1);
  }
  if (lines.length < 2) return { headers: [], rows: [] };

  // Parse header with quote handling
  const parseRow = (line) => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow);

  return { headers, rows };
}

function convertToJSON(csvContent) {
  const { headers, rows } = parseCSV(csvContent);

  // Find indices for columns, using aliases to map to canonical names
  const columnIndices = {};
  headers.forEach((header, idx) => {
    // Trim whitespace from header and check aliases
    const trimmedHeader = header.trim();
    const canonicalName = COLUMN_ALIASES[trimmedHeader];
    if (canonicalName && COLUMNS_TO_KEEP.includes(canonicalName)) {
      columnIndices[canonicalName] = idx;
    }
  });

  if (!("Timestamp" in columnIndices)) {
    throw new Error("CSV must have a 'Timestamp' or 'Date' column");
  }

  // Group data by year
  const dataByYear = {};

  rows.forEach((row) => {
    const timestamp = row[columnIndices["Timestamp"]];
    if (!timestamp) return;

    // Parse M/D/YYYY or M/D/YY format
    const datePart = timestamp.split(" ")[0];
    const [month, day, yearRaw] = datePart.split("/").map(Number);
    if (!month || !day || !yearRaw) return;

    // Handle 2-digit years (e.g., 24 -> 2024)
    const year = yearRaw < 100 ? 2000 + yearRaw : yearRaw;

    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (!dataByYear[year]) {
      dataByYear[year] = {};
    }

    const dayData = {};
    Object.entries(columnIndices).forEach(([colName, idx]) => {
      if (colName !== "Timestamp" && row[idx]) {
        dayData[colName] = row[idx];
      }
    });

    dataByYear[year][dateKey] = dayData;
  });

  return dataByYear;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: node scripts/convert-habits-csv.mjs <input.csv>");
    console.log("");
    console.log("Converts habit tracking CSV to yearly JSON files.");
    console.log("Output: public/data/habits-{year}.json");
    process.exit(1);
  }

  const inputPath = args[0];

  try {
    const csvContent = readFileSync(inputPath, "utf-8");
    const dataByYear = convertToJSON(csvContent);

    // Ensure output directory exists
    const outputDir = join(__dirname, "..", "public", "data");
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Write each year's data to a separate file
    const years = Object.keys(dataByYear).sort();
    years.forEach((year) => {
      const outputPath = join(outputDir, `habits-${year}.json`);
      const daysCount = Object.keys(dataByYear[year]).length;
      writeFileSync(outputPath, JSON.stringify(dataByYear[year], null, 2));
      console.log(`✓ Written ${outputPath} (${daysCount} days)`);
    });

    console.log("");
    console.log(`Done! Created ${years.length} file(s) for years: ${years.join(", ")}`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();

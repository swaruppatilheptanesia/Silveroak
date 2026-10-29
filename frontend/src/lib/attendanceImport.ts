import ExcelJS from 'exceljs';

export type ImportedAttendanceStatus = 'present' | 'absent' | 'late';

export interface ParsedAttendanceRow {
  enrollment: string;
  status: ImportedAttendanceStatus;
}

/** Normalize a free-typed status cell to the backend enum (present|absent|late), else null. */
function normalizeStatus(raw: string): ImportedAttendanceStatus | null {
  const value = raw.trim().toLowerCase();
  if (value === 'present' || value === 'p') return 'present';
  if (value === 'absent' || value === 'a') return 'absent';
  if (value === 'late' || value === 'l') return 'late';
  return null;
}

/** Locate the "Enrollment No" and "Status" columns from the header row (case-insensitive, tolerant). */
function findColumnIndexes(headerCells: string[]): { enrollment: number; status: number } {
  let enrollment = -1;
  let status = -1;
  headerCells.forEach((cell, index) => {
    const header = cell.trim().toLowerCase();
    if (enrollment === -1 && (header.includes('enroll') || header.includes('enrol'))) enrollment = index;
    if (status === -1 && header.includes('status')) status = index;
  });
  return { enrollment, status };
}

function buildRows(matrix: string[][]): ParsedAttendanceRow[] {
  if (matrix.length === 0) return [];
  const { enrollment, status } = findColumnIndexes(matrix[0]);
  if (enrollment === -1 || status === -1) {
    throw new Error('Could not find "Enrollment No" and "Status" columns in the file.');
  }
  const rows: ParsedAttendanceRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const cells = matrix[i];
    const enr = (cells[enrollment] ?? '').trim();
    const st = normalizeStatus(cells[status] ?? '');
    if (!enr || !st) continue;
    rows.push({ enrollment: enr, status: st });
  }
  return rows;
}

/** Minimal CSV parser: handles quoted fields with embedded commas and escaped double-quotes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  for (const line of lines) {
    if (line.trim() === '') continue;
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cells.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    rows.push(cells);
  }
  return rows;
}

/**
 * Parse an uploaded attendance file (.xlsx or .csv) into { enrollment, status } rows.
 * Rows with a blank enrollment or an unrecognized status are dropped. Throws if the
 * Enrollment No / Status columns can't be located.
 */
export async function parseAttendanceRows(file: File): Promise<ParsedAttendanceRow[]> {
  if (file.name.toLowerCase().endsWith('.csv')) {
    return buildRows(parseCsv(await file.text()));
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];
  const matrix: string[][] = [];
  const colCount = worksheet.columnCount;
  for (let r = 1; r <= worksheet.rowCount; r++) {
    const cells: string[] = [];
    for (let c = 1; c <= colCount; c++) {
      cells.push(worksheet.getCell(r, c).text ?? '');
    }
    matrix.push(cells);
  }
  return buildRows(matrix);
}

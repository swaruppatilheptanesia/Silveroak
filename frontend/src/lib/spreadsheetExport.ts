import { format } from 'date-fns';
import ExcelJS from 'exceljs';

export type SpreadsheetCellValue = string | number | boolean | null | undefined;

const FORMULA_INJECTION_RE = /^\s*[=+\-@]/;

export function formatSpreadsheetCell(value: SpreadsheetCellValue): SpreadsheetCellValue {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return value;
  return value.replace(/\r?\n/g, ' ').replace(/\t/g, ' ');
}

function columnWidthFromSamples(samples: SpreadsheetCellValue[]): number {
  let max = 0;
  for (const sample of samples) {
    if (sample === null || sample === undefined) continue;
    const length = String(sample).length;
    if (length > max) max = length;
  }
  return Math.min(Math.max(max + 2, 10), 50);
}

export async function downloadExcelTable(
  headers: string[],
  rows: SpreadsheetCellValue[][],
  filename: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Silver Oak TPO Portal';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Sheet1', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.addRow(headers);
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.commit();

  for (const row of rows) {
    const normalized = row.map((cell) => formatSpreadsheetCell(cell));
    const added = worksheet.addRow(normalized);
    normalized.forEach((cell, index) => {
      if (typeof cell === 'string' && FORMULA_INJECTION_RE.test(cell)) {
        added.getCell(index + 1).numFmt = '@';
      }
    });
  }

  const widthSampleLimit = Math.min(rows.length, 50);
  for (let columnIndex = 0; columnIndex < headers.length; columnIndex++) {
    const samples: SpreadsheetCellValue[] = [headers[columnIndex]];
    for (let rowIndex = 0; rowIndex < widthSampleLimit; rowIndex++) {
      samples.push(rows[rowIndex]?.[columnIndex]);
    }
    worksheet.getColumn(columnIndex + 1).width = columnWidthFromSamples(samples);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvEscapeCell(value: SpreadsheetCellValue): string {
  const normalized = formatSpreadsheetCell(value);
  let text = normalized === null || normalized === undefined ? '' : String(normalized);
  // Neutralise spreadsheet formula injection (=, +, -, @) by prefixing a single quote.
  if (FORMULA_INJECTION_RE.test(text)) {
    text = `'${text}`;
  }
  // Quote any field containing a comma or double-quote; escape inner quotes.
  // (formatSpreadsheetCell already collapsed newlines/tabs to spaces.)
  if (/[",]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function downloadCsvTable(
  headers: string[],
  rows: SpreadsheetCellValue[][],
  filename: string,
): void {
  const lines = [headers, ...rows].map((row) => row.map(csvEscapeCell).join(','));
  // Prepend a UTF-8 BOM so Excel opens accented characters correctly.
  const blob = new Blob(['﻿', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

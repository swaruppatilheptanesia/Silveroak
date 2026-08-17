import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { ValidationError } from '../errors';

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTextNodes(xml: string) {
  return Array.from(
    xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g),
    (match) => decodeXml(match[1] ?? ''),
  ).join('');
}

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell.trim());
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell.trim());
  if (row.some((value) => value !== '')) rows.push(row);
  return rows;
}

function getZipEntries(buffer: Buffer) {
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);

  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === eocdSignature) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset < 0) {
    throw new ValidationError('Invalid XLSX file');
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = new Map<string, Buffer>();
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new ValidationError('Invalid XLSX central directory');
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileName = buffer.toString('utf8', offset + 46, offset + 46 + fileNameLength);

    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const raw = buffer.subarray(dataOffset, dataOffset + compressedSize);

    if (compressionMethod === 0) {
      entries.set(fileName, raw);
    } else if (compressionMethod === 8) {
      entries.set(fileName, zlib.inflateRawSync(raw));
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function getTagAttribute(tag: string, attribute: string) {
  return tag.match(new RegExp(`${attribute}="([^"]*)"`))?.[1] ?? null;
}

function columnIndex(cellReference: string | null) {
  if (!cellReference) return 0;
  const letters = cellReference.match(/^[A-Z]+/i)?.[0].toUpperCase() ?? 'A';
  let index = 0;
  for (const letter of letters) {
    index = index * 26 + letter.charCodeAt(0) - 64;
  }
  return index - 1;
}

function parseSharedStrings(xml: string) {
  const values: string[] = [];
  const sharedStringMatches = xml.match(/<si[\s\S]*?<\/si>/g) ?? [];

  for (const item of sharedStringMatches) {
    values.push(extractTextNodes(item));
  }

  return values;
}

function parseWorkbookSheetPath(entries: Map<string, Buffer>) {
  const workbook = entries.get('xl/workbook.xml')?.toString('utf8');
  const relationships = entries.get('xl/_rels/workbook.xml.rels')?.toString('utf8');

  if (!workbook || !relationships) {
    return 'xl/worksheets/sheet1.xml';
  }

  const firstSheetTag = workbook.match(/<sheet\b[^>]*>/)?.[0];
  const relationId = firstSheetTag ? getTagAttribute(firstSheetTag, 'r:id') : null;
  if (!relationId) return 'xl/worksheets/sheet1.xml';

  const relationshipTag = relationships
    .match(/<Relationship\b[^>]*>/g)
    ?.find((tag) => getTagAttribute(tag, 'Id') === relationId);
  const target = relationshipTag ? getTagAttribute(relationshipTag, 'Target') : null;
  if (!target) return 'xl/worksheets/sheet1.xml';
  if (target.startsWith('/')) return target.replace(/^\//, '');
  return path.posix.normalize(`xl/${target}`);
}

function parseWorksheetRows(xml: string, sharedStrings: string[]) {
  const rows: string[][] = [];
  const rowMatches = xml.match(/<row\b[\s\S]*?<\/row>/g) ?? [];

  for (const rowXml of rowMatches) {
    const row: string[] = [];
    const cellMatches = rowXml.match(/<c\b[\s\S]*?<\/c>/g) ?? [];

    for (const cellXml of cellMatches) {
      const cellTag = cellXml.match(/<c\b[^>]*>/)?.[0] ?? '';
      const reference = getTagAttribute(cellTag, 'r');
      const type = getTagAttribute(cellTag, 't');
      const value = cellXml.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? '';
      const inlineString = cellXml.match(/<is[\s\S]*?<\/is>/)?.[0] ?? '';
      const index = columnIndex(reference);

      if (type === 's') {
        row[index] = sharedStrings[Number(value)] ?? '';
      } else if (type === 'inlineStr') {
        row[index] = extractTextNodes(inlineString);
      } else {
        row[index] = decodeXml(value);
      }
    }

    if (row.some((value) => value !== undefined && value !== '')) {
      rows.push(row.map((value) => value ?? ''));
    }
  }

  return rows;
}

function parseXlsxRows(buffer: Buffer) {
  const entries = getZipEntries(buffer);
  const sharedStrings = entries.get('xl/sharedStrings.xml')
    ? parseSharedStrings(entries.get('xl/sharedStrings.xml')!.toString('utf8'))
    : [];
  const worksheetPath = parseWorkbookSheetPath(entries);
  const worksheet = entries.get(worksheetPath) ?? entries.get('xl/worksheets/sheet1.xml');

  if (!worksheet) {
    throw new ValidationError('No worksheet found in XLSX file');
  }

  return parseWorksheetRows(worksheet.toString('utf8'), sharedStrings);
}

export async function parseSpreadsheetRows(filePath: string, originalName: string) {
  const buffer = await fs.readFile(filePath);
  const extension = path.extname(originalName).toLowerCase();

  if (extension === '.xlsx') {
    return parseXlsxRows(buffer);
  }

  if (extension === '.csv' || extension === '.txt') {
    return parseCsvRows(buffer.toString('utf8').replace(/^\uFEFF/, ''));
  }

  throw new ValidationError('Only CSV and XLSX files are supported');
}

export function normalizeSpreadsheetHeader(value: string) {
  return value
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const LEFT_MARGIN = 42;
const RIGHT_MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;

const TOP_LOGO_WIDTH = 310;
const TOP_LOGO_HEIGHT = 74;
const WATERMARK_WIDTH = 210;
const WATERMARK_HEIGHT = 180;
const TOP_LOGO_X = (PAGE_WIDTH - TOP_LOGO_WIDTH) / 2;
const WATERMARK_X = (PAGE_WIDTH - WATERMARK_WIDTH) / 2;
const WATERMARK_Y = 302;
const WATERMARK_OPACITY = 0.18;
// The stamp source has a large transparent canvas, so crop to the visible seal area.
const NOC_SIGNATURE_STAMP_CROP = {
  left: 400,
  top: 1702,
  width: 2830,
  height: 1583,
};
const NOC_SIGNATURE_STAMP_WIDTH = 70;
const NOC_SIGNATURE_STAMP_HEIGHT = Math.round(
  (NOC_SIGNATURE_STAMP_WIDTH * NOC_SIGNATURE_STAMP_CROP.height) / NOC_SIGNATURE_STAMP_CROP.width
);
const NOC_SIGNATURE_STAMP_X = LEFT_MARGIN + 36;
const NOC_SIGNATURE_STAMP_Y = 170;
const NOC_SIGNATURE_WITH_REGARDS_Y = 214;
const NOC_SIGNATURE_NAME_Y = 162;
const NOC_SIGNATURE_TITLE_Y = 148;
const NOC_SIGNATURE_MOBILE_Y = 134;
const NOC_SIGNATURE_EMAIL_Y = 120;

const BODY_FONT = 'Helvetica';
const BODY_FONT_BOLD = 'Helvetica-Bold';
const BODY_FONT_OBLIQUE = 'Helvetica-Oblique';
const BODY_FONT_BOLD_OBLIQUE = 'Helvetica-BoldOblique';

type PdfStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
};

type StyledToken = {
  text: string;
  style: PdfStyle;
};

type TextBlockType = 'paragraph' | 'heading' | 'list-item';

type TextBlock = {
  type: TextBlockType;
  fontSize: number;
  segments: StyledToken[];
};

export interface NocCertificateStudent {
  full_name: string;
  enrollment_number: string;
  department: string;
  batch: string;
  current_semester: string | null;
  course: string | null;
  institute: string | null;
}

export interface NocCertificateContext {
  referenceNumber: string;
  issueDate: Date;
  contactPersonName: string | null;
  contactPersonDesignation: string | null;
  subject: string;
  bodyHtml: string;
  programLabel: string;
  student: NocCertificateStudent;
  noc: {
    company_name: string;
    company_address: string | null;
    company_city: string | null;
    company_state: string | null;
    company_pincode: string | null;
    role_title: string;
    start_date: Date;
    end_date: Date | null;
  };
}

function escapePdfText(value: string) {
  return normalizePdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function normalizePdfText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00a0/g, ' ');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function formatDate(date: Date, separator = '/') {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}${separator}${month}${separator}${year}`;
}

function measureCharacterWidth(character: string, fontSize: number, bold = false, italic = false) {
  if (character === ' ') return fontSize * 0.28;
  if (/^[ilI1'`.,:;|!\/\\-]$/.test(character)) return fontSize * 0.23;
  if (/^[mwMW@#%&]$/.test(character)) return fontSize * 0.95;
  if (/^[A-Z]$/.test(character)) return fontSize * (bold ? 0.68 : 0.63);
  if (/^[0-9]$/.test(character)) return fontSize * 0.56;
  if (italic) return fontSize * 0.55;
  return fontSize * (bold ? 0.58 : 0.52);
}

function measureText(value: string, fontSize: number, style: PdfStyle = {}) {
  return Array.from(value).reduce(
    (total, character) => total + measureCharacterWidth(character, fontSize, Boolean(style.bold), Boolean(style.italic)),
    0
  );
}

function pickFont(style: PdfStyle = {}) {
  if (style.bold && style.italic) return BODY_FONT_BOLD_OBLIQUE;
  if (style.bold) return BODY_FONT_BOLD;
  if (style.italic) return BODY_FONT_OBLIQUE;
  return BODY_FONT;
}

function resolveAssetPath(fileName: string) {
  const candidates = [
    path.resolve(process.cwd(), 'src/assets', fileName),
    path.resolve(process.cwd(), 'docs/silveroak_backend/src/assets', fileName),
    path.resolve(__dirname, '../../../src/assets', fileName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to locate asset: ${fileName}`);
}

function resolveTemplateTokens(value: string, replacements: Record<string, string>) {
  return value.replace(/{{\s*([^}]+)\s*}}/g, (_match, token) => {
    const key = String(token).trim();
    return replacements[key] ?? '';
  });
}

function resolveTemplateHtml(value: string, replacements: Record<string, string>) {
  const escapedReplacements = Object.fromEntries(
    Object.entries(replacements).map(([key, replacement]) => [key, escapeHtml(replacement)])
  );

  return resolveTemplateTokens(value, escapedReplacements);
}

function currentStyle(styleStack: PdfStyle[]) {
  return styleStack[styleStack.length - 1] ?? {};
}

function pushStyle(styleStack: PdfStyle[], patch: PdfStyle) {
  styleStack.push({ ...currentStyle(styleStack), ...patch });
}

function popStyle(styleStack: PdfStyle[]) {
  if (styleStack.length > 1) {
    styleStack.pop();
  }
}

function pushBlock(blocks: TextBlock[], block: TextBlock | null) {
  if (!block) return;
  const filteredSegments = block.segments.filter((segment) => segment.text.trim().length > 0);
  if (filteredSegments.length > 0) {
    blocks.push({ ...block, segments: filteredSegments });
  }
}

function parseHtmlBlocks(html: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const tokens = html.match(/<!--[\s\S]*?-->|<\/?[a-zA-Z0-9]+[^>]*>|[^<]+/g) ?? [];
  const styleStack: PdfStyle[] = [{}];
  let currentBlock: TextBlock | null = null;

  const startBlock = (type: TextBlockType, fontSize: number) => {
    pushBlock(blocks, currentBlock);
    currentBlock = {
      type,
      fontSize,
      segments: [],
    };
    return currentBlock;
  };

  const appendText = (text: string) => {
    const normalized = decodeHtmlEntities(text)
      .replace(/\u00a0/g, ' ')
      .replace(/\r?\n/g, ' ');

    if (!normalized) return;

    if (!currentBlock) {
      currentBlock = {
        type: 'paragraph',
        fontSize: 11,
        segments: [],
      };
    }

    currentBlock.segments.push({
      text: normalized,
      style: { ...currentStyle(styleStack) },
    });
  };

  for (const rawToken of tokens) {
    if (!rawToken) continue;

    if (rawToken.startsWith('<!--')) {
      continue;
    }

    if (rawToken.startsWith('<')) {
      const isClosing = rawToken.startsWith('</');
      const tagName = rawToken
        .replace(/^<\/?\s*/, '')
        .replace(/\s*\/?\s*>$/, '')
        .split(/\s+/)[0]
        .toLowerCase();

      if (isClosing) {
        if (['p', 'div', 'li', 'h1', 'h2', 'h3'].includes(tagName)) {
          if (['h1', 'h2', 'h3'].includes(tagName)) {
            popStyle(styleStack);
          }
          pushBlock(blocks, currentBlock);
          currentBlock = null;
          continue;
        }

        if (['strong', 'b', 'em', 'i', 'u'].includes(tagName)) {
          popStyle(styleStack);
        }

        continue;
      }

      if (tagName === 'br') {
        appendText(' ');
        continue;
      }

      if (tagName === 'p' || tagName === 'div') {
        startBlock('paragraph', 11);
        continue;
      }

      if (tagName === 'li') {
        const listItemBlock = startBlock('list-item', 11);
        listItemBlock.segments.push({
          text: '- ',
          style: {},
        });
        continue;
      }

      if (tagName === 'h1') {
        startBlock('heading', 15);
        pushStyle(styleStack, { bold: true });
        continue;
      }

      if (tagName === 'h2') {
        startBlock('heading', 13);
        pushStyle(styleStack, { bold: true });
        continue;
      }

      if (tagName === 'h3') {
        startBlock('heading', 12);
        pushStyle(styleStack, { bold: true });
        continue;
      }

      if (tagName === 'strong' || tagName === 'b') {
        pushStyle(styleStack, { bold: true });
        continue;
      }

      if (tagName === 'em' || tagName === 'i') {
        pushStyle(styleStack, { italic: true });
        continue;
      }

      if (tagName === 'u') {
        pushStyle(styleStack, { underline: true });
        continue;
      }

      continue;
    }

    appendText(rawToken);
  }

  pushBlock(blocks, currentBlock);
  return blocks;
}

function wrapBlock(block: TextBlock, maxWidth: number) {
  const tokens: StyledToken[] = [];

  for (const segment of block.segments) {
    const parts = segment.text.split(/(\s+)/);
    parts.forEach((part) => {
      if (!part) return;
      tokens.push({
        text: part,
        style: { ...segment.style },
      });
    });
  }

  const lines: StyledToken[][] = [];
  let currentLine: StyledToken[] = [];
  let currentWidth = 0;

  for (const token of tokens) {
    const tokenText = token.text;
    const isWhitespace = /^\s+$/.test(tokenText);
    const tokenWidth = measureText(tokenText, block.fontSize, token.style);

    if (isWhitespace && currentLine.length === 0) {
      continue;
    }

    if (currentLine.length > 0 && currentWidth + tokenWidth > maxWidth && !isWhitespace) {
      lines.push(currentLine);
      currentLine = [];
      currentWidth = 0;
      if (isWhitespace) continue;
    }

    currentLine.push(token);
    currentWidth += tokenWidth;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [[]];
}

function wrapCellText(value: string, maxWidth: number, fontSize: number, style: PdfStyle = {}) {
  const normalized = value.replace(/\r?\n/g, '\n').trim();
  if (!normalized) return [''];

  const lines: string[] = [];

  normalized.split('\n').forEach((segment) => {
    const words = segment.replace(/\s+/g, ' ').trim().split(' ');
    if (words.length === 1 && !words[0]) {
      lines.push('');
      return;
    }

    let currentLine = '';
    let currentWidth = 0;

    for (const word of words) {
      if (!word) continue;

      const wordWidth = measureText(word, fontSize, style);
      const spaceWidth = currentLine ? measureText(' ', fontSize, style) : 0;

      if (currentLine && currentWidth + spaceWidth + wordWidth > maxWidth) {
        lines.push(currentLine);
        currentLine = word;
        currentWidth = wordWidth;
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
        currentWidth = currentLine === word ? wordWidth : currentWidth + spaceWidth + wordWidth;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  });

  return lines.length > 0 ? lines : [''];
}

function buildTextLineCommands(
  line: StyledToken[],
  x: number,
  y: number,
  fontSize: number,
  align: 'left' | 'center' | 'right' = 'left',
  color: [number, number, number] = [0, 0, 0]
) {
  const totalWidth = line.reduce((sum, segment) => sum + measureText(segment.text, fontSize, segment.style), 0);
  let currentX = x;
  const [red, green, blue] = color;

  if (align === 'center') {
    currentX = x - totalWidth / 2;
  } else if (align === 'right') {
    currentX = x - totalWidth;
  }

  let commands = `${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(3)} rg\nBT\n1 0 0 1 ${currentX.toFixed(2)} ${y.toFixed(2)} Tm\n`;
  let lastFont = '';

  for (const segment of line) {
    const font = pickFont(segment.style);
    if (font !== lastFont) {
      commands += `/${font} ${fontSize.toFixed(2)} Tf\n`;
      lastFont = font;
    }

    commands += `(${escapePdfText(segment.text)}) Tj\n`;
  }

  commands += 'ET\n';
  return commands;
}

function buildUnderlinedCenteredText(
  text: string,
  centerX: number,
  baselineY: number,
  fontSize: number,
  widthMultiplier = 1
) {
  const textWidth = measureText(text, fontSize, { bold: true }) * widthMultiplier;
  const x = centerX - textWidth / 2;
  const underlineY = baselineY - 2;

  return [
    buildTextLineCommands([{ text, style: { bold: true } }], centerX, baselineY, fontSize, 'center'),
    `${x.toFixed(2)} ${underlineY.toFixed(2)} m ${(x + textWidth).toFixed(2)} ${underlineY.toFixed(2)} l S\n`,
  ].join('');
}

function buildFixedFooter() {
  let commands = '';

  commands += '0.9 w\n';
  commands += buildTextLineCommands(
    [{ text: 'Established under The Gujarat Private Universities Act 2009', style: { bold: true } }],
    PAGE_WIDTH / 2,
    70,
    8.3,
    'center',
    [0.44, 0.20, 0.12]
  );
  commands += `${LEFT_MARGIN.toFixed(2)} 60.00 m ${(PAGE_WIDTH - LEFT_MARGIN).toFixed(2)} 60.00 l S\n`;
  // Two centered lines: address, then phone/email/web.
  commands += buildTextLineCommands(
    [
      {
        text: 'Nr. Bhavik Publications, Opp. Bhagwat Vidhyapith, S.G. Road, Gota, Ahmedabad - 382481',
        style: {},
      },
    ],
    PAGE_WIDTH / 2,
    48,
    6.2,
    'center'
  );
  commands += buildTextLineCommands(
    [
      {
        text: 'Phone : +91-79-66046300 | E-Mail : info@silveroakuni.ac.in | Web : www.silveroakuni.ac.in',
        style: {},
      },
    ],
    PAGE_WIDTH / 2,
    39,
    6.2,
    'center'
  );

  return commands;
}

function buildBodyBlocks(
  subject: string,
  bodyHtml: string,
  replacements: Record<string, string>
) {
  const resolvedSubject = cleanText(resolveTemplateTokens(subject, replacements));
  const resolvedBody = resolveTemplateHtml(bodyHtml, replacements);
  const blocks: TextBlock[] = [];

  if (resolvedBody.trim()) {
    blocks.push(...parseHtmlBlocks(resolvedBody));
  }

  return { resolvedSubject, blocks };
}

function buildPdfObjects(contentCommands: string, images: Array<{ name: string; buffer: Buffer; width: number; height: number }>) {
  const objects: Buffer[] = [];
  const addObject = (body: string | Buffer) => {
    const objectNumber = objects.length + 1;
    const header = Buffer.from(`${objectNumber} 0 obj\n`, 'utf8');
    const footer = Buffer.from('\nendobj\n', 'utf8');
    const payload = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
    objects.push(Buffer.concat([header, payload, footer]));
    return objectNumber;
  };

  const fontRegular = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const fontItalic = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>');
  const fontBoldItalic = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique >>');

  const imageObjects = images.map((image) => {
    const compressed = zlib.deflateSync(image.buffer);
    const stream = Buffer.concat([
      Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${compressed.length} >>\nstream\n`,
        'utf8'
      ),
      compressed,
      Buffer.from('\nendstream', 'utf8'),
    ]);

    return addObject(stream);
  });

  const contentStream = Buffer.from(contentCommands, 'utf8');
  const contentObject = addObject(
    Buffer.concat([
      Buffer.from(`<< /Length ${contentStream.length} >>\nstream\n`, 'utf8'),
      contentStream,
      Buffer.from('\nendstream', 'utf8'),
    ])
  );

  const resources = [
    '<< /Font <<',
    `/F1 ${fontRegular} 0 R`,
    `/F2 ${fontBold} 0 R`,
    `/F3 ${fontItalic} 0 R`,
    `/F4 ${fontBoldItalic} 0 R`,
    '>>',
    '/XObject <<',
    imageObjects.map((objectNumber, index) => `/Im${index + 1} ${objectNumber} 0 R`).join(' '),
    '>>',
    '>>',
  ].join(' ');

  const pageObjectNumber = objects.length + 1;
  const pagesObjectNumber = pageObjectNumber + 1;

  const pageObject = addObject(
    `<< /Type /Page /Parent ${pagesObjectNumber} 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] /Resources ${resources} /Contents ${contentObject} 0 R >>`
  );

  const pagesObject = addObject(`<< /Type /Pages /Kids [${pageObject} 0 R] /Count 1 >>`);
  const catalogObject = addObject(`<< /Type /Catalog /Pages ${pagesObject} 0 R >>`);

  return { objects, catalogObject };
}

type ImageCrop = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function buildImageObjectBuffer(filePath: string, crop?: ImageCrop, opacity = 1) {
  const buffer = fs.readFileSync(filePath);
  const signature = buffer.subarray(0, 8).toString('hex');
  const pngSignature = '89504e470d0a1a0a';

  if (signature !== pngSignature) {
    throw new Error(`Unsupported PNG file: ${path.basename(filePath)}`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let bitDepth = 8;
  const idatParts: Buffer[] = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    offset += 4;
    const chunkType = buffer.toString('ascii', offset, offset + 4);
    offset += 4;
    const chunkData = buffer.subarray(offset, offset + length);
    offset += length + 4; // skip data + crc

    if (chunkType === 'IHDR') {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      bitDepth = chunkData.readUInt8(8);
      colorType = chunkData.readUInt8(9);
    }

    if (chunkType === 'IDAT') {
      idatParts.push(chunkData);
    }

    if (chunkType === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG color format in ${path.basename(filePath)}`);
  }

  const compressed = Buffer.concat(idatParts);
  const inflated = zlib.inflateSync(compressed);
  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const rowBytes = width * bytesPerPixel;
  const raw = Buffer.alloc(width * height * bytesPerPixel);

  let inputOffset = 0;
  let outputOffset = 0;
  let previousRow = Buffer.alloc(rowBytes);

  const paethPredictor = (left: number, above: number, upperLeft: number) => {
    const p = left + above - upperLeft;
    const pa = Math.abs(p - left);
    const pb = Math.abs(p - above);
    const pc = Math.abs(p - upperLeft);
    if (pa <= pb && pa <= pc) return left;
    if (pb <= pc) return above;
    return upperLeft;
  };

  for (let y = 0; y < height; y += 1) {
    const filterType = inflated.readUInt8(inputOffset);
    inputOffset += 1;
    const currentRow = Buffer.alloc(rowBytes);
    const encodedRow = inflated.subarray(inputOffset, inputOffset + rowBytes);
    inputOffset += rowBytes;

    for (let x = 0; x < rowBytes; x += 1) {
      const rawValue = encodedRow[x];
      const left = x >= bytesPerPixel ? currentRow[x - bytesPerPixel] : 0;
      const above = previousRow[x] ?? 0;
      const upperLeft = x >= bytesPerPixel ? previousRow[x - bytesPerPixel] ?? 0 : 0;

      switch (filterType) {
        case 0:
          currentRow[x] = rawValue;
          break;
        case 1:
          currentRow[x] = (rawValue + left) & 0xff;
          break;
        case 2:
          currentRow[x] = (rawValue + above) & 0xff;
          break;
        case 3:
          currentRow[x] = (rawValue + Math.floor((left + above) / 2)) & 0xff;
          break;
        case 4:
          currentRow[x] = (rawValue + paethPredictor(left, above, upperLeft)) & 0xff;
          break;
        default:
          throw new Error(`Unsupported PNG filter ${filterType} in ${path.basename(filePath)}`);
      }
    }

    currentRow.copy(raw, outputOffset);
    outputOffset += rowBytes;
    previousRow = currentRow;
  }

  const rgb = Buffer.alloc(width * height * 3);
  for (let i = 0, j = 0; i < raw.length; i += bytesPerPixel, j += 3) {
    const red = raw[i] ?? 0;
    const green = raw[i + 1] ?? 0;
    const blue = raw[i + 2] ?? 0;
    const alpha = colorType === 6 ? (raw[i + 3] ?? 255) / 255 : 1;
    rgb[j] = Math.round(red * alpha + 255 * (1 - alpha));
    rgb[j + 1] = Math.round(green * alpha + 255 * (1 - alpha));
    rgb[j + 2] = Math.round(blue * alpha + 255 * (1 - alpha));
  }

  const visibility = Math.max(0, Math.min(1, opacity));
  if (visibility < 1) {
    for (let i = 0; i < rgb.length; i += 3) {
      rgb[i] = Math.round(rgb[i] * visibility + 255 * (1 - visibility));
      rgb[i + 1] = Math.round(rgb[i + 1] * visibility + 255 * (1 - visibility));
      rgb[i + 2] = Math.round(rgb[i + 2] * visibility + 255 * (1 - visibility));
    }
  }

  if (!crop) {
    return {
      width,
      height,
      buffer: rgb,
    };
  }

  const { left, top, width: cropWidth, height: cropHeight } = crop;
  if (left < 0 || top < 0 || cropWidth <= 0 || cropHeight <= 0 || left + cropWidth > width || top + cropHeight > height) {
    throw new Error(`Invalid crop bounds for ${path.basename(filePath)}`);
  }

  const cropped = Buffer.alloc(cropWidth * cropHeight * 3);
  for (let row = 0; row < cropHeight; row += 1) {
    const sourceStart = ((top + row) * width + left) * 3;
    const targetStart = row * cropWidth * 3;
    rgb.copy(cropped, targetStart, sourceStart, sourceStart + cropWidth * 3);
  }

  return {
    width: cropWidth,
    height: cropHeight,
    buffer: cropped,
  };
}

function drawImage(name: string, x: number, y: number, width: number, height: number) {
  return [
    'q',
    `${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm`,
    `/${name} Do`,
    'Q',
    '',
  ].join('\n');
}

function drawLine(x1: number, y1: number, x2: number, y2: number, width = 0.8) {
  return `${width.toFixed(2)} w\n${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S\n`;
}

function buildTableRow(
  headers: Array<{ text: string; width: number }>,
  values: Array<string>,
  x: number,
  y: number,
  rowHeight: number
) {
  let commands = '';
  let currentX = x;
  headers.forEach((header, index) => {
    commands += drawLine(currentX, y, currentX, y - rowHeight, 0.6);
    const value = values[index] ?? '';
    const centerX = currentX + header.width / 2;
    const baseFontSize = index === 4 ? 8.5 : 9;
    const lineHeight = index === 4 ? 8.8 : 9.2;
    const cellPaddingTop = index === 4 ? 10 : 11;
    const wrappedLines = index === 4
      ? value.split('\n').flatMap((line) => wrapCellText(line, header.width - 8, baseFontSize))
      : wrapCellText(value, header.width - 8, baseFontSize, { bold: index === 0 });

    wrappedLines.slice(0, 4).forEach((lineText, lineIndex) => {
      commands += buildTextLineCommands(
        [{
          text: lineText,
          style: {
            bold: index === 0 || (index === 4 && lineIndex === 1),
          },
        }],
        centerX,
        y - cellPaddingTop - (lineIndex * lineHeight),
        baseFontSize,
        'center'
      );
    });
    currentX += header.width;
  });
  commands += drawLine(currentX, y, currentX, y - rowHeight, 0.6);
  commands += drawLine(x, y, currentX, y, 0.8);
  commands += drawLine(x, y - rowHeight, currentX, y - rowHeight, 0.8);
  return commands;
}

function buildTableHeader(
  headers: Array<{ text: string; width: number }>,
  x: number,
  y: number,
  rowHeight: number
) {
  let commands = '';
  let currentX = x;
  headers.forEach((header) => {
    commands += drawLine(currentX, y, currentX, y - rowHeight, 0.6);
    commands += buildTextLineCommands([{ text: header.text, style: { bold: true } }], currentX + header.width / 2, y - 13, 9.5, 'center');
    currentX += header.width;
  });
  commands += drawLine(currentX, y, currentX, y - rowHeight, 0.6);
  commands += drawLine(x, y, currentX, y, 0.8);
  commands += drawLine(x, y - rowHeight, currentX, y - rowHeight, 0.8);
  return commands;
}

export function buildPostingTypeShortCode(value: string) {
  const letters = value.replace(/[^A-Za-z]/g, '').toUpperCase();
  if (letters.length < 3) {
    return 'GEN';
  }
  return letters.slice(0, 3);
}

export function buildNocReferenceNumber(issueDate: Date, postingTypeValue: string, sequence: number) {
  const monthYear = `${String(issueDate.getMonth() + 1).padStart(2, '0')}-${issueDate.getFullYear()}`;
  const postingTypeCode = buildPostingTypeShortCode(postingTypeValue);
  return `SOU/TPO/${monthYear}/${postingTypeCode}/${String(sequence).padStart(4, '0')}`;
}

export async function generateNocCertificatePdf(context: NocCertificateContext) {
  const logo = buildImageObjectBuffer(resolveAssetPath('LOGO_NOC.png'));
  const watermark = buildImageObjectBuffer(resolveAssetPath('noc_png.png'), undefined, WATERMARK_OPACITY);
  const signatureStamp = buildImageObjectBuffer(resolveAssetPath('stamp.png'), NOC_SIGNATURE_STAMP_CROP);

  const replacements: Record<string, string> = {
    reference_number: context.referenceNumber,
    reference_no: context.referenceNumber,
    date: formatDate(context.issueDate, '/'),
    issue_date: formatDate(context.issueDate, '/'),
    contact_person_name: context.contactPersonName ?? '',
    contact_person_designation: context.contactPersonDesignation ?? '',
    student_name: context.student.full_name,
    enrollment_number: context.student.enrollment_number,
    branch: context.student.department,
    department: context.student.department,
    batch: context.student.batch,
    semester: context.student.current_semester ?? '',
    current_semester: context.student.current_semester ?? '',
    institute: context.student.institute ?? '',
    course: context.student.course ?? '',
    program_label: context.programLabel,
    program: context.programLabel,
    company_name: context.noc.company_name,
    company_address: context.noc.company_address ?? '',
    company_city: context.noc.company_city ?? '',
    company_state: context.noc.company_state ?? '',
    company_pincode: context.noc.company_pincode ?? '',
    role_title: context.noc.role_title,
    start_date: formatDate(context.noc.start_date, '-'),
    end_date: context.noc.end_date ? formatDate(context.noc.end_date, '-') : '-',
  };

  const { resolvedSubject, blocks } = buildBodyBlocks(context.subject, context.bodyHtml, replacements);

  let content = '';

  content += '0.9 w\n';
  content += drawImage('Im1', TOP_LOGO_X, 756, TOP_LOGO_WIDTH, TOP_LOGO_HEIGHT);
  content += drawImage('Im2', WATERMARK_X, WATERMARK_Y, WATERMARK_WIDTH, WATERMARK_HEIGHT);

  content += buildTextLineCommands([{ text: `Ref No.: ${context.referenceNumber}`, style: {} }], LEFT_MARGIN + 2, 716, 10.5, 'left');
  content += buildTextLineCommands([{ text: `Date: ${formatDate(context.issueDate, '/')}`, style: {} }], PAGE_WIDTH - RIGHT_MARGIN, 716, 10.5, 'right');
  content += buildUnderlinedCenteredText('NO OBJECTION CERTIFICATE', PAGE_WIDTH / 2, 684, 14);

  // Recipient block: fixed "To," / "H.R. Manager / Training Team" / company name. Company name is
  // skipped only if empty. Rule sits below at y=611, clear of the fixed "Sub:" line at y=588.
  const RECIPIENT_BLOCK_TOP = 650;
  const RECIPIENT_LINE_HEIGHT = 13;

  const recipientLines = [
    { text: 'H.R. Manager / Training Team', size: 11 },
    { text: context.noc.company_name, size: 11 },
  ].filter((line): line is { text: string; size: number } => Boolean(line.text?.trim()));

  content += buildTextLineCommands([{ text: 'To,', style: {} }], LEFT_MARGIN + 2, RECIPIENT_BLOCK_TOP, 11, 'left');

  let recipientY = RECIPIENT_BLOCK_TOP;
  recipientLines.forEach((line) => {
    recipientY -= RECIPIENT_LINE_HEIGHT;
    content += buildTextLineCommands([{ text: line.text.trim(), style: {} }], LEFT_MARGIN + 2, recipientY, line.size, 'left');
  });

  const recipientRuleY = recipientY - 5;
  content += drawLine(LEFT_MARGIN + 2, recipientRuleY, LEFT_MARGIN + 120, recipientRuleY, 0.6);

  content += buildTextLineCommands([{ text: `Sub: ${resolvedSubject}`, style: { bold: true } }], PAGE_WIDTH / 2, 588, 11.5, 'center');

  const bodyStartY = 558;
  const maxBodyWidth = CONTENT_WIDTH - 10;
  let currentY = bodyStartY;
  blocks.forEach((block, blockIndex) => {
    const lines = wrapBlock(block, maxBodyWidth);
    const lineHeight = block.fontSize * 1.42;
    const gapAfterBlock = block.type === 'heading' ? 6 : 8;

    lines.forEach((line) => {
      content += buildTextLineCommands(line, LEFT_MARGIN + 4, currentY, block.fontSize, 'left');
      currentY -= lineHeight;
    });

    if (blockIndex < blocks.length - 1) {
      currentY -= gapAfterBlock;
    }
  });

  // Student details as labeled rows (mirrors the on-screen preview NocTemplatePreview.tsx).
  const durationText = `${formatDate(context.noc.start_date, '-')} to ${
    context.noc.end_date ? formatDate(context.noc.end_date, '-') : '-'
  }`;
  const studentFields: { label: string; value: string }[] = [
    { label: 'Enrollment No.', value: context.student.enrollment_number || '-' },
    { label: 'Student Name', value: context.student.full_name || '-' },
    { label: 'Institute Name', value: context.student.institute || '-' },
    { label: 'Course', value: context.student.course || '-' },
    { label: 'Branch', value: context.student.department || '-' },
    { label: 'Semester', value: context.student.current_semester ? String(context.student.current_semester) : '-' },
    { label: 'Duration', value: durationText },
  ];

  const STUDENT_BLOCK_TOP = 300;
  const STUDENT_LINE_HEIGHT = 12;
  studentFields.forEach((field, index) => {
    const rowY = STUDENT_BLOCK_TOP - index * STUDENT_LINE_HEIGHT;
    content += buildTextLineCommands(
      [
        { text: `${field.label} : `, style: { bold: true } },
        { text: field.value, style: {} },
      ],
      LEFT_MARGIN + 2,
      rowY,
      10,
      'left'
    );
  });

  content += buildTextLineCommands([{ text: 'With Regards,', style: {} }], LEFT_MARGIN + 2, NOC_SIGNATURE_WITH_REGARDS_Y, 10.5, 'left');
  content += drawImage('Im3', NOC_SIGNATURE_STAMP_X, NOC_SIGNATURE_STAMP_Y, NOC_SIGNATURE_STAMP_WIDTH, NOC_SIGNATURE_STAMP_HEIGHT);

  content += buildTextLineCommands([{ text: 'Dr. Nipen Shukla', style: { bold: true } }], LEFT_MARGIN + 2, NOC_SIGNATURE_NAME_Y, 10.5, 'left');
  content += buildTextLineCommands([{ text: 'Director - Training & Placement Cell', style: {} }], LEFT_MARGIN + 2, NOC_SIGNATURE_TITLE_Y, 9.5, 'left');
  content += buildTextLineCommands([{ text: 'Email: internship@silveroakuni.ac.in', style: {} }], LEFT_MARGIN + 2, NOC_SIGNATURE_EMAIL_Y, 9.5, 'left');

  content += buildFixedFooter();

  const images = [
    { name: 'Im1', buffer: logo.buffer, width: logo.width, height: logo.height },
    { name: 'Im2', buffer: watermark.buffer, width: watermark.width, height: watermark.height },
    { name: 'Im3', buffer: signatureStamp.buffer, width: signatureStamp.width, height: signatureStamp.height },
  ];

  const { objects, catalogObject } = buildPdfObjects(content, images);

  const pdfParts: Buffer[] = [];
  const offsets: number[] = [];
  pdfParts.push(Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary'));

  let currentOffset = pdfParts[0].length;
  objects.forEach((objectBuffer) => {
    offsets.push(currentOffset);
    pdfParts.push(objectBuffer);
    currentOffset += objectBuffer.length;
  });

  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    xref += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdfParts.push(Buffer.from(xref, 'utf8'));

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObject} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  pdfParts.push(Buffer.from(trailer, 'utf8'));

  return Buffer.concat(pdfParts);
}

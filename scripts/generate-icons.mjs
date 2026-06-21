import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

function crc32(buf) {
  let crc = 0xffffffff;
  for (let byte of buf) {
    crc = crc ^ byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBytes, data, crcBuf]);
}

function createPNG(width, height, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT: filtered scanlines
  const rawLines = [];
  for (let y = 0; y < height; y++) {
    const scanline = Buffer.alloc(1 + width * 3);
    scanline[0] = 0; // filter none
    for (let x = 0; x < width; x++) {
      // Rounded rect: skip corners
      const cx = x / (width - 1), cy = y / (height - 1);
      const dx = cx < 0.5 ? cx : 1 - cx;
      const dy = cy < 0.5 ? cy : 1 - cy;
      const rx = Math.max(0, dx * width - width * 0.35);
      const ry = Math.max(0, dy * height - height * 0.35);
      const cornerDist = Math.sqrt(rx * rx + ry * ry);
      const cornerRadius = Math.min(width, height) * 0.15;
      if (cornerDist > cornerRadius) {
        // Transparent-ish (white for simplicity)
        scanline[x * 3 + 1] = 255;
        scanline[x * 3 + 2] = 255;
        scanline[x * 3 + 3] = 255;
      } else {
        // Background color
        scanline[x * 3 + 1] = r;
        scanline[x * 3 + 2] = g;
        scanline[x * 3 + 3] = b;
      }
    }
    rawLines.push(scanline);
  }
  const raw = Buffer.concat(rawLines);
  const compressed = deflateSync(raw);

  const iend = Buffer.alloc(0);

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', iend),
  ]);
}

// Generate 192x192 icon
const icon192 = createPNG(192, 192, 59, 130, 246); // brand blue #3b82f6
writeFileSync(join(import.meta.dirname, '..', 'public', 'icon-192.png'), icon192);

// Generate 512x512 icon
const icon512 = createPNG(512, 512, 59, 130, 246);
writeFileSync(join(import.meta.dirname, '..', 'public', 'icon-512.png'), icon512);

console.log('Generated icon-192.png and icon-512.png');

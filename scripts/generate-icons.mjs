// Erzeugt einfache Platzhalter-PNG-Icons (pinker Kreis-Look) ohne Bildbibliothek.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function pngFromRGBA(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // rows mit Filter-Byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// bg: [r,g,b,a], circle: [r,g,b,a]; circle radius factor of size
function makeIcon(size, bg, circle, radiusFactor = 0.3) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * radiusFactor;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const inCircle = (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
      const col = inCircle ? circle : bg;
      rgba[i] = col[0];
      rgba[i + 1] = col[1];
      rgba[i + 2] = col[2];
      rgba[i + 3] = col[3];
    }
  }
  return pngFromRGBA(size, size, rgba);
}

const PINK = [219, 39, 119, 255];
const WHITE = [255, 255, 255, 255];
const TRANSPARENT = [0, 0, 0, 0];

const files = {
  "public/icon-192x192.png": makeIcon(192, PINK, WHITE),
  "public/icon-512x512.png": makeIcon(512, PINK, WHITE),
  "public/icon.png": makeIcon(192, PINK, WHITE),
  "public/apple-icon.png": makeIcon(180, PINK, WHITE),
  // Badge: monochrom weiß auf transparent
  "public/badge.png": makeIcon(96, TRANSPARENT, WHITE, 0.42),
};

for (const [path, buf] of Object.entries(files)) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  console.log("wrote", path, buf.length, "bytes");
}

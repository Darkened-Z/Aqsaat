// Generates solid-color PNG icons using only Node.js built-ins (no deps)
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, t, data, crc]);
}

function solidPNG(size, r, g, b) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8; ihdrData[9] = 2; // 8-bit RGB
  const ihdr = chunk('IHDR', ihdrData);
  const row = Buffer.alloc(1 + size * 3);
  row[0] = 0; // filter: none
  for (let x = 0; x < size; x++) {
    row[1 + x * 3]     = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  const idat = chunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  const iend = chunk('IEND', Buffer.alloc(0));
  return Buffer.concat([sig, ihdr, idat, iend]);
}

const pub = path.join(__dirname, '../public');
if (!fs.existsSync(pub)) fs.mkdirSync(pub, { recursive: true });

// Aqsat green: #0f6b4b = rgb(15, 107, 75)
const [r, g, b] = [15, 107, 75];
fs.writeFileSync(path.join(pub, 'icon-192.png'),       solidPNG(192, r, g, b));
fs.writeFileSync(path.join(pub, 'icon-512.png'),       solidPNG(512, r, g, b));
fs.writeFileSync(path.join(pub, 'apple-touch-icon.png'), solidPNG(180, r, g, b));
console.log('Icons written to public/');

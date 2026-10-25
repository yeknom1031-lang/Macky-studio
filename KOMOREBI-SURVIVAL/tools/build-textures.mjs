import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/assets');
const directory = path.join(root, 'textures');
fs.mkdirSync(directory, { recursive: true });
const families = [
  ['meadow', [112, 139, 75]], ['moss', [63, 99, 58]], ['granite', [126, 130, 127]],
  ['snow', [219, 232, 234]], ['sand', [188, 163, 112]], ['autumn', [146, 113, 63]],
  ['earth', [99, 78, 54]], ['wetland', [71, 98, 67]], ['bark', [95, 75, 52]],
  ['fur-russet', [159, 99, 53]], ['fur-silver', [145, 147, 144]], ['fur-dark', [69, 60, 48]],
  ['fur-cream', [204, 195, 164]], ['feathers', [100, 103, 90]], ['leaves', [60, 107, 54]],
  ['flowers', [172, 128, 160]], ['lichen', [132, 141, 93]], ['ice', [148, 194, 205]],
  ['red-rock', [158, 95, 65]], ['riverbed', [103, 117, 112]]
];
const table = new Uint32Array(256);
for (let entry = 0; entry < 256; entry++) {
  let value = entry;
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  table[entry] = value >>> 0;
}
function crc(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = table[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(type, body) {
  const name = Buffer.from(type);
  const output = Buffer.alloc(body.length + 12);
  output.writeUInt32BE(body.length, 0); name.copy(output, 4); body.copy(output, 8);
  output.writeUInt32BE(crc(Buffer.concat([name, body])), body.length + 8);
  return output;
}
function png(width, height, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  const scanlines = Buffer.alloc(height * (width * 3 + 1));
  for (let row = 0; row < height; row++) pixels.copy(scanlines, row * (width * 3 + 1) + 1, row * width * 3, (row + 1) * width * 3);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', zlib.deflateSync(scanlines)), chunk('IEND', Buffer.alloc(0))]);
}
const tileSize = 128;
const atlasSize = 4096;
const atlas = Buffer.alloc(atlasSize * atlasSize * 3);
const entries = [];
for (let family = 0; family < families.length; family++) {
  const [name, base] = families[family];
  for (let variant = 0; variant < 50; variant++) {
    const index = family * 50 + variant;
    const pixels = Buffer.alloc(tileSize * tileSize * 3);
    const phase = variant * 1.718 + family * 3.13;
    for (let row = 0; row < tileSize; row++) for (let column = 0; column < tileSize; column++) {
      const horizontal = column / 127 * Math.PI * 2;
      const vertical = row / 127 * Math.PI * 2;
      const broad = Math.sin(horizontal * 2 + phase) * Math.cos(vertical * 3 - phase);
      const fine = Math.sin(horizontal * 23 + Math.cos(vertical * 11 + phase) * 3) * Math.cos(vertical * 29 + phase);
      const mottles = Math.sin(horizontal * 7 + vertical * 5 + phase) * Math.sin(vertical * 9 - horizontal * 4);
      const fibers = Math.sin(horizontal * (family === 8 ? 17 : 37) + Math.sin(vertical * 2) * 3 + phase);
      let grain = broad * 12 + fine * 9 + mottles * 8;
      if (family >= 8 && family <= 13) grain += fibers * 16;
      if ([2, 16, 18, 19].includes(family)) grain -= Math.pow(Math.max(0, Math.cos(horizontal * 3 + Math.sin(vertical * 4) + phase)), 25) * 23;
      if (family === 3 || family === 17) grain *= 0.4;
      const offset = (row * tileSize + column) * 3;
      for (let channel = 0; channel < 3; channel++) pixels[offset + channel] = Math.max(0, Math.min(255, base[channel] + grain + Math.sin(phase + channel) * 7));
    }
    const filename = `${name}-${String(variant + 1).padStart(2, '0')}.png`;
    fs.writeFileSync(path.join(directory, filename), png(tileSize, tileSize, pixels));
    const atlasColumn = index % 32 * tileSize;
    const atlasRow = Math.floor(index / 32) * tileSize;
    for (let row = 0; row < tileSize; row++) pixels.copy(atlas, ((atlasRow + row) * atlasSize + atlasColumn) * 3, row * tileSize * 3, (row + 1) * tileSize * 3);
    entries.push({ index, family: name, file: `textures/${filename}`, origin: 'procedural', width: tileSize, height: tileSize });
  }
}
fs.writeFileSync(path.join(root, 'nature-atlas.png'), png(atlasSize, atlasSize, atlas));
fs.writeFileSync(path.join(root, 'texture-manifest.json'), JSON.stringify({ proceduralCount: entries.length, atlas: 'nature-atlas.png', columns: 32, tileSize, families: families.map(([name]) => name), entries }, null, 2));
console.log(`Generated ${entries.length} individual seamless textures and a 4096px atlas.`);

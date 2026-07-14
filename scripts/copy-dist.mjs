// client/dist → kök dist aynası. rm -rf/cp -r yerine cross-platform Node.
//
// Ek görev: bulut senkronunun (Drive/iCloud) oluşturduğu "dosya 2.ext" kopya
// artıklarını AYIKLAR — bunlar Hostinger'a yüklenirse .htaccess cache
// regex'lerine uymaz ve SW/manifest kopyaları tutarsız durum yükleyebilir.

import { rmSync, mkdirSync, cpSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'client', 'dist');
const DEST = join(ROOT, 'dist');

// "ad 2.ext", "ad 3" gibi senkron artığı deseni (uzantısız "sw 2" dahil)
const SYNC_ARTIFACT = / \d+(\.[^./\\]+)?$/;

let copied = 0;
let skipped = 0;

function walkCopy(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir)) {
    if (SYNC_ARTIFACT.test(entry)) {
      skipped++;
      continue;
    }
    const srcPath = join(srcDir, entry);
    if (statSync(srcPath).isDirectory()) {
      walkCopy(srcPath, join(destDir, entry));
    } else {
      cpSync(srcPath, join(destDir, entry));
      copied++;
    }
  }
}

try {
  statSync(SRC);
} catch {
  console.error(`HATA: ${SRC} yok — önce "npm --prefix client run build" koşmalı.`);
  process.exit(1);
}

rmSync(DEST, { recursive: true, force: true });
walkCopy(SRC, DEST);

console.log(`dist/ güncellendi: ${copied} dosya kopyalandı${skipped > 0 ? `, ${skipped} senkron artığı (" 2" kopyası) AYIKLANDI` : ''}.`);
if (skipped > 0) {
  console.log('Not: artıkların kaynağı bulut senkronudur; repo klasörünü senkron dışına almak kalıcı çözümdür.');
}

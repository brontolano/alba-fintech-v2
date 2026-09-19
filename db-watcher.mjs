// Watcher koneksi DB: catat status tiap 2 menit ke db-watcher.log
// Berhenti otomatis setelah DB pulih 3 kali cek berturut-turut.
import net from 'net';
import fs from 'fs';

const HOST = 'srv594.hstgr.io';
const LOG = 'db-watcher.log';
const stamp = () => new Date().toLocaleString('id-ID', { hour12: false });

function probe() {
  return new Promise((resolve) => {
    const s = net.connect(3306, HOST);
    const t = setTimeout(() => { s.destroy(); resolve(false); }, 6000);
    s.on('connect', () => { clearTimeout(t); s.destroy(); resolve(true); });
    s.on('error', () => { clearTimeout(t); resolve(false); });
  });
}

let okStreak = 0;
fs.appendFileSync(LOG, `[${stamp()}] watcher mulai — memantau ${HOST}:3306 tiap 2 menit\n`);
const interval = setInterval(async () => {
  const up = await probe();
  if (up) {
    okStreak++;
    fs.appendFileSync(LOG, `[${stamp()}] UP (streak ${okStreak}/3)\n`);
    if (okStreak >= 3) {
      fs.appendFileSync(LOG, `[${stamp()}] DB PULIH — watcher selesai\n`);
      clearInterval(interval);
      process.exit(0);
    }
  } else {
    if (okStreak > 0) fs.appendFileSync(LOG, `[${stamp()}] turun lagi\n`);
    okStreak = 0;
  }
}, 120_000);

// Cek pertama langsung
const first = await probe();
fs.appendFileSync(LOG, `[${stamp()}] cek pertama: ${first ? 'UP' : 'DOWN'}\n`);
if (first) okStreak = 1;

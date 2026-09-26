export type Section = {
  title: string;
  steps: string[];
  img?: string;
};

export type Tutorial = {
  id: string;
  user: string;
  role: string;
  unit: string;
  email: string;
  summary: string;
  sections: Section[];
};

export type TutorialGroup = {
  group: string;
  items: Tutorial[];
};

const IMG = "/tutorial/img";
const LOGIN_IMG = `${IMG}/01-login.png`;

const loginSection = (email: string): Section => ({
  title: "Cara Login",
  steps: [
    "Buka aplikasi di browser HP (Chrome/Safari).",
    `Isi Email ${email}.`,
    "Isi Password yang diberikan admin (minta ke superadmin/pimpinan unit bila belum punya).",
    "Ketuk Masuk untuk masuk ke dashboard.",
  ],
  img: LOGIN_IMG,
});

const dailyRoutine = (items: string[]): Section => ({
  title: "Rutinitas Harian",
  steps: items,
});

export const TUTORIAL_GROUPS: TutorialGroup[] = [
  {
    group: "Pimpinan",
    items: [
      {
        id: "pimpinan",
        user: "Pimpinan Lembaga",
        role: "PIMPINAN",
        unit: "Lembaga",
        email: "pimpinan@alba.app",
        summary: "Pantau lembaga, setujui pengajuan, baca laporan.",
        sections: [
          loginSection("pimpinan@alba.app"),
          {
            title: "Membaca Dashboard Eksekutif",
            steps: [
              "Grid jalan pintas: Input Data, Buku Kas, Papan Pantau, Laporan, Pengumuman, Persetujuan, Unit, Kategori, Pegawai, Belanja.",
              "Perhatikan kartu Menunggu Persetujuan (jumlah pengajuan menunggu keputusan).",
              "Cek ringkasan Total Saldo untuk denyut kas lembaga.",
            ],
            img: `${IMG}/06-pimpinan-dashboard.png`,
          },
          {
            title: "Menyetujui / Menolak Pengajuan",
            steps: [
              "Dari dashboard ketuk Persetujuan (atau menu bawah Pengajuan).",
              "Buka tab Pending untuk melihat antrean.",
              "Ketuk satu pengajuan untuk membaca rincian (nominal, keperluan, pengaju, unit).",
              "Ketuk Setujui untuk meloloskan, atau Tolak dengan mengisi alasan.",
            ],
            img: `${IMG}/07-pimpinan-approvals.png`,
          },
          {
            title: "Melihat Laporan",
            steps: [
              "Ketuk Laporan di dashboard.",
              "Pilih periode dan unit untuk melihat rekap pemasukan, pengeluaran, dan saldo.",
            ],
            img: `${IMG}/08-pimpinan-reports.png`,
          },
          {
            title: "Memeriksa Buku Kas",
            steps: [
              "Ketuk Buku Kas.",
              "Saring per unit, kategori, atau tanggal untuk menelusuri transaksi.",
            ],
            img: `${IMG}/09-pimpinan-buku-kas.png`,
          },
          dailyRoutine([
            "Buka dashboard — lihat kartu Menunggu Persetujuan.",
            "Habiskan antrean Pending (setujui/tolak + alasan).",
            "Cek Total Saldo dan transaksi Hari Ini.",
          ]),
        ],
      },
    ],
  },
  {
    group: "KPAK",
    items: [
      {
        id: "manager-kpak",
        user: "Manager KPAK",
        role: "MANAGER",
        unit: "KPAK",
        email: "manager.kpak@alba.app",
        summary: "Pusat kerja, putuskan antrean, awasi kru, tutup hari.",
        sections: [
          loginSection("manager.kpak@alba.app"),
          {
            title: "Membuka Pusat Kerja",
            steps: [
              "Buka Kerja Harian → Pusat Kerja.",
              "Ikuti 5 langkah alur harian dan kerjakan Tugas berikutnya yang ditampilkan.",
            ],
            img: `${IMG}/10-manager-kpak-pusat-kerja.png`,
          },
          {
            title: "Memutuskan Hal yang Menunggu",
            steps: [
              "Buka Kerja Harian → Perlu Keputusan.",
              "Laporan Shift Kru — baca lalu ketuk Terima Laporan.",
              "Pengajuan transaksi — ketuk Setujui atau Tolak.",
            ],
            img: `${IMG}/11-manager-kpak-review.png`,
          },
          {
            title: "Mengawasi Kru (Kru & Kinerja)",
            steps: [
              "Buka Kerja Harian → Kru & Kinerja.",
              "Lakukan Check-in General (pengawasan) di awal hari.",
              "Pantau siapa yang sedang bertugas (badge angka = kru aktif).",
            ],
            img: `${IMG}/mkpak-crew.png`,
          },
          {
            title: "Menutup Hari (Tutup Hari)",
            steps: [
              "Buka Kerja Harian → Tutup Hari di akhir operasional.",
              "Langkah 1 — catat laci fisik (tunai), ketuk Lanjut hitung fisik.",
              "Langkah 2 — isi Uang fisik di laci saat ini, cocokkan dengan sistem (Pas/Selisih).",
              "Ketuk Tutup Hari Ini (ketuk dua kali sebagai konfirmasi).",
              "Serah terima otomatis dibuat untuk pimpinan. Cetak Berita Acara bila perlu.",
            ],
            img: `${IMG}/mkpak-closeday.png`,
          },
          {
            title: "Memantau Anggaran Saya",
            steps: [
              "Buka Kelola → Anggaran Saya.",
              "Lihat pagu vs realisasi anggaran unit KPAK.",
            ],
            img: `${IMG}/mkpak-budget.png`,
          },
          dailyRoutine([
            "Pusat Kerja → kerjakan Tugas berikutnya.",
            "Kru & Kinerja → check-in general + pantau kru.",
            "Perlu Keputusan → nolkan antrean.",
            "Tutup Hari → tutup dan serah terima ke pimpinan.",
          ]),
        ],
      },
      {
        id: "staff-kpak",
        user: "Staff KPAK",
        role: "STAFF",
        unit: "KPAK",
        email: "staff.kpak@alba.app",
        summary: "Check-in shift, layani tabungan & administrasi santri.",
        sections: [
          loginSection("staff.kpak@alba.app"),
          {
            title: "Check-in Shift + Pilih Layanan (wajib pertama)",
            steps: [
              "Buka Layanan KPAK → Shift Saya.",
              "Ketuk Mulai shift hari ini, lalu pilih layanan:",
              "Check-in Tabungan — untuk setoran/penarikan tabungan santri.",
              "Check-in Keuangan — untuk pembayaran administrasi.",
              "Anda langsung diantar ke halaman layanan. Tanpa check-in, menu Tabungan & Keuangan terkunci.",
              "Pindah layanan tanpa checkout via tombol Ganti ke Tabungan/Keuangan.",
            ],
            img: `${IMG}/18-staff-kpak-shift.png`,
          },
          {
            title: "Melayani Tabungan Santri",
            steps: [
              "Pastikan shift layanan Tabungan aktif.",
              "Cari santri dengan NIS/Nomor santri, ketuk Cari.",
              "Setoran: isi nominal → Simpan Setoran. Penarikan tunai: isi nominal → simpan (diambil di loket).",
              "Santri baru? Ketuk Santri Baru / Simpan Santri (atau daftarkan dulu di Data Santri).",
              "Bisa Cetak Kartu Tabungan sebagai bukti.",
            ],
            img: `${IMG}/skpak-savings.png`,
          },
          {
            title: "Melayani Pembayaran Administrasi",
            steps: [
              "Pastikan shift layanan Keuangan aktif.",
              "Buka Layanan KPAK → Layanan Keuangan.",
              "Pilih jenis (mis. HER/SPP, Daftar Ulang), isi Nominal (Rp) dan Keterangan (mis. HER September).",
              "Ketuk Catat Pembayaran. Status: Pembayaran tercatat — menunggu persetujuan.",
            ],
            img: `${IMG}/19-staff-kpak-layanan.png`,
          },
          {
            title: "Mencari Data Santri",
            steps: [
              "Buka Data KPAK → Data Santri.",
              "Cari nama/NIS untuk verifikasi layanan.",
            ],
            img: `${IMG}/skpak-students.png`,
          },
          {
            title: "Check-out + Laporan Shift",
            steps: [
              "Kembali ke Shift Saya di akhir tugas.",
              "Kirim Laporan shift ke manager.",
              "Ketuk Check-out.",
            ],
          },
          dailyRoutine([
            "Login → Shift Saya → check-in + pilih layanan.",
            "Layani sesuai antrean (Tabungan/Keuangan).",
            "Kirim laporan shift → Check-out.",
          ]),
        ],
      },
    ],
  },
  {
    group: "Koperasi Buku",
    items: [
      {
        id: "manager-koperasi",
        user: "Manager Koperasi Buku",
        role: "MANAGER",
        unit: "Koperasi Buku",
        email: "manager.koperasi@alba.app",
        summary: "Pantau jualan, review stok, kelola belanja & inventori.",
        sections: [
          loginSection("manager.koperasi@alba.app"),
          {
            title: "Membaca Dashboard (Pusat Kerja)",
            steps: [
              "Ringkasan jualan + badge antrean: Review Stok Masuk, Hitung Sisa, Pengajuan.",
            ],
            img: `${IMG}/12-manager-retail-dashboard.png`,
          },
          {
            title: "Shift Saya",
            steps: [
              "Buka Kerja Harian → Shift Saya.",
              "Mulai shift (check-in) di awal tugas, pantau kru, check-out di akhir.",
            ],
            img: `${IMG}/mkop-shift.png`,
          },
          {
            title: "Melayani di POS (bila dibutuhkan)",
            steps: [
              "Buka Kerja Harian → POS.",
              "Pastikan Shift Kasir terbuka (isi modal/kas awal bila diminta).",
              "Ikuti 4 langkah: Katalog → Bayar → Struk → Selesai.",
            ],
            img: `${IMG}/13-manager-retail-pos.png`,
          },
          {
            title: "Mereview Stok Masuk (wajib harian)",
            steps: [
              "Buka Kerja Harian → Review Stok Masuk (badge = draf menunggu).",
              "Ketuk satu batch untuk melihat rincian barang.",
              "Setujui → konfirmasi Setujui batch? Stok akan bertambah.",
              "Tolak → isi Catatan review (wajib). Staff memperbaiki inputnya.",
            ],
            img: `${IMG}/14-manager-retail-review-stok.png`,
          },
          {
            title: "Belanja Stok",
            steps: [
              "Buka Kelola → Belanja Stok.",
              "Tambah barang ke keranjang (Tambah / + Tambah Baris), isi judul dan catatan.",
              "Ketuk Ajukan Belanja (terkirim ke Pimpinan).",
              "Setelah barang datang + invoice ada: Bayar & Catat Transaksi (isi No. Invoice + Total Final).",
            ],
            img: `${IMG}/mkop-belanja.png`,
          },
          {
            title: "Memeriksa Inventori",
            steps: [
              "Buka Kelola → Inventori untuk daftar persediaan dan level stok.",
            ],
            img: `${IMG}/mkop-inventory.png`,
          },
          dailyRoutine([
            "Shift Saya → mulai shift.",
            "Review Stok Masuk → nolkan draf batch.",
            "Hitung Sisa → setujui hitungan staff.",
            "Tutup shift.",
          ]),
        ],
      },
      {
        id: "staff-koperasi",
        user: "Staff Koperasi Buku",
        role: "STAFF",
        unit: "Koperasi Buku",
        email: "staff.koperasi@alba.app",
        summary: "Jaga kasir POS, input stok masuk, hitung sisa.",
        sections: [
          loginSection("staff.koperasi@alba.app"),
          {
            title: "Memulai Shift (wajib pertama)",
            steps: [
              "Buka Retail Saya → Shift Saya.",
              "Ketuk Check-in Kasir (jaga kasir) dan/atau Check-in Inventori (urus stok).",
              "Isi kas awal/modal untuk membuka Shift Kasir.",
              "Akhiri dengan Check-out.",
            ],
            img: `${IMG}/15-staff-retail-shift.png`,
          },
          {
            title: "Membuka & Melayani POS",
            steps: [
              "Buka Toko → POS (sudah check-in + Shift Kasir terbuka).",
              "Langkah 1 — Katalog: cari produk (ketik nama atau Scan barcode/SKU), masuk keranjang.",
              "Langkah 2 — Bayar: tunai via Bayar (isi Uang Bayar, cek kembalian) atau kartu santri via Bayar dengan Kartu.",
              "Langkah 3 — Struk: periksa rincian, Cetak Struk bila diminta.",
              "Langkah 4 — Selesai: tercatat di penjualan hari ini.",
            ],
            img: `${IMG}/17-staff-retail-pos.png`,
          },
          {
            title: "Menambah Barang (Stok Masuk)",
            steps: [
              "Menu Tambah Barang sudah digabung ke wizard Stok Masuk.",
              "Buka Retail Saya → Stok Masuk.",
              "Pilih Barang Pondok (milik unit) atau Titipan UMKM (butuh data pemilik + No. WA aktif).",
              "Isi tanggal datang + catatan; per baris pilih Dari database atau Barang baru, isi Qty dan Harga beli (+ Tambah baris).",
              "Ketuk Simpan Draf — menunggu persetujuan manager.",
            ],
            img: `${IMG}/skop-stokmasuk.png`,
          },
          {
            title: "Menghitung Sisa (stok opname)",
            steps: [
              "Buka Retail Saya → Hitung Sisa.",
              "Isi sisa fisik tiap barang yang dihitung.",
              "Ketuk Simpan Hitungan — menunggu persetujuan Manager, lalu stok selaras otomatis.",
            ],
            img: `${IMG}/16-staff-retail-hitung-sisa.png`,
          },
          {
            title: "Melihat Stok & Belanja",
            steps: [
              "Retail Saya → Stok — cek persediaan.",
              "Retail Saya → Belanja — catat kebutuhan belanja.",
            ],
            img: `${IMG}/skop-inventory.png`,
          },
          dailyRoutine([
            "Login → Shift Saya → check-in (+ buka Shift Kasir bila jaga kasir).",
            "Tugas: POS / Stok Masuk / Hitung Sisa.",
            "Check-out setiap pulang.",
          ]),
        ],
      },
    ],
  },
  {
    group: "Kantin Umi",
    items: [
      {
        id: "manager-kantin-umi",
        user: "Manager Kantin Umi",
        role: "MANAGER",
        unit: "Kantin Umi",
        email: "manager.kantinumi@alba.app",
        summary: "Pantau jualan, review stok, kelola belanja & inventori.",
        sections: [
          loginSection("manager.kantinumi@alba.app"),
          {
            title: "Membaca Dashboard (Pusat Kerja)",
            steps: [
              "Ringkasan jualan Kantin Umi + badge antrean: Review Stok Masuk, Hitung Sisa, Pengajuan.",
            ],
            img: `${IMG}/mumi-dashboard.png`,
          },
          {
            title: "Shift Saya",
            steps: [
              "Buka Kerja Harian → Shift Saya.",
              "Mulai shift (check-in), pantau kru, check-out di akhir.",
            ],
            img: `${IMG}/mumi-shift.png`,
          },
          {
            title: "Melayani di POS (bila dibutuhkan)",
            steps: [
              "Buka Kerja Harian → POS, pastikan Shift Kasir terbuka.",
              "Ikuti 4 langkah: Katalog → Bayar → Struk → Selesai.",
            ],
            img: `${IMG}/mumi-pos.png`,
          },
          {
            title: "Mereview Stok Masuk (wajib harian)",
            steps: [
              "Buka Kerja Harian → Review Stok Masuk.",
              "Ketuk batch draf → periksa rincian.",
              "Setujui (konfirmasi Setujui batch? Stok akan bertambah) atau Tolak dengan catatan wajib.",
            ],
            img: `${IMG}/mumi-review.png`,
          },
          {
            title: "Belanja Stok",
            steps: [
              "Buka Kelola → Belanja Stok.",
              "Tambah barang (Tambah / + Tambah Baris), isi judul + catatan.",
              "Ketuk Ajukan Belanja (ke Pimpinan).",
              "Setelah barang datang + invoice ada: Bayar & Catat Transaksi.",
            ],
            img: `${IMG}/mumi-belanja.png`,
          },
          {
            title: "Memeriksa Inventori",
            steps: [
              "Buka Kelola → Inventori untuk stok Kantin Umi.",
            ],
            img: `${IMG}/mumi-inventory.png`,
          },
          dailyRoutine([
            "Shift Saya → mulai shift.",
            "Review Stok Masuk → nolkan draf.",
            "Hitung Sisa → setujui hitungan staff.",
            "Tutup shift.",
          ]),
        ],
      },
      {
        id: "staff-kantin-umi",
        user: "Staff Kantin Umi",
        role: "STAFF",
        unit: "Kantin Umi",
        email: "staff.kantinumi@alba.app",
        summary: "Jaga kasir POS, input stok masuk, hitung sisa.",
        sections: [
          loginSection("staff.kantinumi@alba.app"),
          {
            title: "Memulai Shift (wajib pertama)",
            steps: [
              "Buka Retail Saya → Shift Saya.",
              "Ketuk Check-in Kasir dan/atau Check-in Inventori.",
              "Isi kas awal/modal untuk membuka Shift Kasir.",
              "Akhiri dengan Check-out.",
            ],
            img: `${IMG}/sumi-shift.png`,
          },
          {
            title: "Membuka & Melayani POS",
            steps: [
              "Buka Toko → POS (sudah check-in + Shift Kasir terbuka).",
              "Katalog — cari/ketik nama atau scan barcode, masukkan ke keranjang.",
              "Bayar — tunai (Bayar) atau kartu santri (Bayar dengan Kartu).",
              "Struk — cek + Cetak Struk bila diminta.",
              "Selesai — tercatat di penjualan hari ini.",
            ],
            img: `${IMG}/sumi-pos.png`,
          },
          {
            title: "Menambah Barang (Stok Masuk)",
            steps: [
              "Buka Retail Saya → Stok Masuk.",
              "Pilih Barang Pondok (milik unit) atau Titipan UMKM (butuh data pemilik + No. WA).",
              "Isi tanggal datang + catatan; per baris pilih Dari database atau Barang baru, isi Qty dan Harga beli (+ Tambah baris).",
              "Ketuk Simpan Draf — menunggu persetujuan manager.",
            ],
            img: `${IMG}/sumi-stokmasuk.png`,
          },
          {
            title: "Menghitung Sisa",
            steps: [
              "Buka Retail Saya → Hitung Sisa.",
              "Isi sisa fisik tiap barang → Simpan Hitungan.",
              "Menunggu persetujuan manager untuk selaras otomatis.",
            ],
            img: `${IMG}/sumi-sisa.png`,
          },
          {
            title: "Melihat Stok & Belanja",
            steps: [
              "Retail Saya → Stok — cek persediaan Kantin Umi.",
              "Retail Saya → Belanja — catat kebutuhan belanja.",
            ],
            img: `${IMG}/sumi-inventory.png`,
          },
          dailyRoutine([
            "Login → Shift Saya → check-in (+ buka Shift Kasir).",
            "Tugas: POS / Stok Masuk / Hitung Sisa.",
            "Check-out saat pulang.",
          ]),
        ],
      },
    ],
  },
  {
    group: "Kantin Baru",
    items: [
      {
        id: "manager-kantin-baru",
        user: "Manager Kantin Baru",
        role: "MANAGER",
        unit: "Kantin Baru",
        email: "manager.kantinbaru@alba.app",
        summary: "Pantau jualan, review stok, kelola belanja & inventori.",
        sections: [
          loginSection("manager.kantinbaru@alba.app"),
          {
            title: "Membaca Dashboard (Pusat Kerja)",
            steps: [
              "Ringkasan jualan Kantin Baru + badge antrean: Review Stok Masuk, Hitung Sisa, Pengajuan.",
            ],
            img: `${IMG}/mbaru-dashboard.png`,
          },
          {
            title: "Shift Saya",
            steps: [
              "Buka Kerja Harian → Shift Saya.",
              "Mulai shift (check-in), pantau kru, check-out di akhir.",
            ],
            img: `${IMG}/mbaru-shift.png`,
          },
          {
            title: "Melayani di POS (bila dibutuhkan)",
            steps: [
              "Buka Kerja Harian → POS, pastikan Shift Kasir terbuka.",
              "Ikuti 4 langkah: Katalog → Bayar → Struk → Selesai.",
            ],
            img: `${IMG}/mbaru-pos.png`,
          },
          {
            title: "Mereview Stok Masuk (wajib harian)",
            steps: [
              "Buka Kerja Harian → Review Stok Masuk.",
              "Ketuk batch draf → periksa rincian.",
              "Setujui (konfirmasi Setujui batch? Stok akan bertambah) atau Tolak dengan catatan wajib.",
            ],
            img: `${IMG}/mbaru-review.png`,
          },
          {
            title: "Belanja Stok",
            steps: [
              "Buka Kelola → Belanja Stok.",
              "Tambah barang (Tambah / + Tambah Baris), isi judul + catatan.",
              "Ketuk Ajukan Belanja (ke Pimpinan).",
              "Setelah barang datang + invoice ada: Bayar & Catat Transaksi.",
            ],
            img: `${IMG}/mbaru-belanja.png`,
          },
          {
            title: "Memeriksa Inventori",
            steps: [
              "Buka Kelola → Inventori untuk stok Kantin Baru.",
            ],
            img: `${IMG}/mbaru-inventory.png`,
          },
          dailyRoutine([
            "Shift Saya → mulai shift.",
            "Review Stok Masuk → nolkan draf.",
            "Hitung Sisa → setujui hitungan staff.",
            "Tutup shift.",
          ]),
        ],
      },
      {
        id: "staff-kantin-baru",
        user: "Staff Kantin Baru",
        role: "STAFF",
        unit: "Kantin Baru",
        email: "staff.kantinbaru@alba.app",
        summary: "Jaga kasir POS, input stok masuk, hitung sisa.",
        sections: [
          loginSection("staff.kantinbaru@alba.app"),
          {
            title: "Memulai Shift (wajib pertama)",
            steps: [
              "Buka Retail Saya → Shift Saya.",
              "Ketuk Check-in Kasir dan/atau Check-in Inventori.",
              "Isi kas awal/modal untuk membuka Shift Kasir.",
              "Akhiri dengan Check-out.",
            ],
            img: `${IMG}/sbaru-shift.png`,
          },
          {
            title: "Membuka & Melayani POS",
            steps: [
              "Buka Toko → POS (sudah check-in + Shift Kasir terbuka).",
              "Katalog — cari/ketik nama atau scan barcode, masukkan ke keranjang.",
              "Bayar — tunai (Bayar) atau kartu santri (Bayar dengan Kartu).",
              "Struk — cek + Cetak Struk bila diminta.",
              "Selesai — tercatat di penjualan hari ini.",
            ],
            img: `${IMG}/sbaru-pos.png`,
          },
          {
            title: "Menambah Barang (Stok Masuk)",
            steps: [
              "Buka Retail Saya → Stok Masuk.",
              "Pilih Barang Pondok (milik unit) atau Titipan UMKM (butuh data pemilik + No. WA).",
              "Isi tanggal datang + catatan; per baris pilih Dari database atau Barang baru, isi Qty dan Harga beli (+ Tambah baris).",
              "Ketuk Simpan Draf — menunggu persetujuan manager.",
            ],
            img: `${IMG}/sbaru-stokmasuk.png`,
          },
          {
            title: "Menghitung Sisa",
            steps: [
              "Buka Retail Saya → Hitung Sisa.",
              "Isi sisa fisik tiap barang → Simpan Hitungan.",
              "Menunggu persetujuan manager untuk selaras otomatis.",
            ],
            img: `${IMG}/sbaru-sisa.png`,
          },
          {
            title: "Melihat Stok & Belanja",
            steps: [
              "Retail Saya → Stok — cek persediaan Kantin Baru.",
              "Retail Saya → Belanja — catat kebutuhan belanja.",
            ],
            img: `${IMG}/sbaru-inventory.png`,
          },
          dailyRoutine([
            "Login → Shift Saya → check-in (+ buka Shift Kasir).",
            "Tugas: POS / Stok Masuk / Hitung Sisa.",
            "Check-out saat pulang.",
          ]),
        ],
      },
    ],
  },
];

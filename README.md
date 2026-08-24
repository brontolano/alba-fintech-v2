# ALBA Finance v2

Sistem keuangan berbasis web untuk pesantren/organisasi — dikembangkan dengan **Next.js 14**, **Prisma**, **MySQL**, dan **NextAuth v4**. Dirancang untuk deployment di **Hostinger** dengan konfigurasi **standalone**.

## 🔑 Fitur Utama
- 💸 **Transaction Manager** — CRUD pemasukan/pengeluaran
- ✅ **Approval Workflow** — status tracking (Draft → Pending → Approved/Rejected)
- 📦 **Retail POS** — point-of-sale dengan cart system
- 🏢 **Unit Management** — manajemen unit organisasi (CRUD + soft-delete)
- 🔐 **RBAC System** — 4 role (Superadmin, Pimpinan, Manager, Staff)

## 🏗️ Tech Stack
| Tools | Version |
|-------|---------|
| Next.js | 14 (App Router) |
| Prisma | 6.x |
| Database | MySQL |
| Auth | NextAuth v4 |
| UI | Tailwind CSS + shadcn/ui |
| Deploy | Hostinger (Node.js) |

## ⚙️ Setup
```bash
cp .env.example .env    # edit DATABASE_URL ke MySQL
npx prisma generate
npx prisma db push      # buat tabel di database
npx prisma db:seed      # seed admin:pass = bismillah
npx next build         # compile (5.8s)
node server.js         # jalankan di Hostinger (port 3000)
```

Lihat full panduan: [DEPLOYMENT.md](./DEPLOYMENT.md) | [DEPLOY.md](./DEPLOY.md)

## 🔐 Role Access Matrix
| Fitur | Superadmin | Pimpinan | Manager | Staff |
|-------|:-:|:-:|:-:|:-:|
| Transaction CRUD | ✅ | ✅ | ✅ | ✅ (own unit) |
| Approval | ✅ | ✅ | ❌ | ❌ |
| POS | ✅ | ✅ | ✅ | ✅ |
| Unit Management | ✅ | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |

> **Developer:** BrontoLano (@brontolano) | **Ustadz:** Muhammad Hamdan  
> **Environment:** Production-ready — GitHub push verified (61 files, commit `7e9a8c2`)

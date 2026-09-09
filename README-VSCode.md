# Virtual Company AI — VS Code Native Agent Team

Tim AI virtual ini dirancang untuk berjalan **di VS Code** tanpa dependensi Hermes runtime eksternal. Setiap agen adalah Copilot Agent yang membaca file persona di folder `agents/`.

## Cara Menggunakan

### 1. Buka workspace ini di VS Code

```bash
code c:\AI\.hermes\workspace\alba-fintech-v4
```

### 2. Aktifkan Agent Mode di Copilot

- Tekan `Ctrl+Shift+P` → ketik **Copilot: Toggle Agent Mode**
- Atau klik ikon **Agent** di panel Copilot Chat

### 3. Jalankan Agen

VS Code Copilot Agent secara otomatis mendeteksi `AGENTS.md` dan bisa dipanggil dengan tag handle, misalnya:

```
@open @ceo       — Launch CEO agent (Pak Asep)
@open @developer  — Launch Developer agent (Pak Toni)
@open @tester     — Launch Tester agent (Ibu Rini)
```

> Catatan: `@open` adalah command yang didefinisikan oleh Copilot Agent API. Jika belum tersedia, gunakan perintah:
>
> ```
> Saya ingin mengundang @developer untuk meninjau kode ini.
> ```

### 4. Koordinasi Antar-Agen

Agen saling mengundefiksi melalui mention di Copilot Chat:

```
@teamlead Tolong review PR ini dari @developer. Link: [file path]
```

Setiap agen akan:

1. Membaca `AGENTS.md` untuk memahami reporting line
2. Membaca file `soul.md`-nya di folder `agents/<role>/`
3. Bekerja sesuai persona dan prinsip yang didefinisikan

## Struktur Direktori

```
alba-fintech-v4/
├── AGENTS.md              # Konstitusi tim — wajib dibaca semua agen
├── .vscode/
│   ├── settings.json      # VS Code settings
│   └── tasks.json         # Task runner untuk meluncur agen
├── agents/
│   ├── ceo/soul.md        # Persona CEO — Pak Asep
│   ├── cto/soul.md        # Persona CTO — Pak Indra
│   ├── team-lead/soul.md  # Persona Team Lead — Pak Budi
│   ├── developer/soul.md  # Persona Developer — Pak Toni
│   ├── designer/soul.md   # Persona Designer — Ibu Nina
│   ├── researcher/soul.md # Persona Researcher — Ibu Sari
│   ├── tester/soul.md     # Persona Tester — Ibu Rini
│   ├── devops/soul.md     # Persona DevOps — Mas Yanto
│   └── scrum/soul.md      # Persona Scrum Master — Mas Eko
└── workspace/
    ├── state/             # Shared state antar agen
    └── issues/            # Issue tracking
```

## Reporting Line

```
@developer    ─┐
@designer      ├─→ @teamlead ──→ @cto ──→ @ceo ──→ Founder (user)
@researcher    ─┘
@tester      ──┘
@scrum       ──┬─────────────────────────────→ @ceo ──→ Founder (user)
@devops      ──┴────────────────────────→ @cto ──→ @ceo ──→ Founder (user)
```

## Model yang Direkomendasikan

- `@ceo`: Model yang kuat untuk quality gate (Claude 3.5 Sonnet / GPT-4o)
- `@cto`: Model teknis untuk arsitektur (GPT-4o / Claude 3.5 Sonnet)
- `@developer`: Model coding (GPT-4o / Claude 3.5 Sonnet / Code Llama)
- `@tester`: Model untuk test generation (Claude 3.5 Sonnet)
- Agen lain: model default Copilot cukup

---

*Setup untuk VS Code native — bebas migrasi ke Hermes runtime nanti jika dibutuhkan.*

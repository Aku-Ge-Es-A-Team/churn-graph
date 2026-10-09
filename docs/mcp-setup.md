# MCP Setup — churn-graph

Universal MCP server config untuk project ini, bisa dipakai di **VS Code, Antigravity,
Windsurf, Cursor** dan dikonsumsi AI agent **Codex, Claude Code, Kiro**.

MCP server yang dikonfigurasi:

| Server | Paket (pinned) | Fungsi |
|---|---|---|
| **context7** | `@upstash/context7-mcp@4.2.0` | Dokumentasi library up-to-date, version-specific, langsung ke prompt |
| **playwright** | `@playwright/mcp@0.0.83` (Microsoft) | Browser automation via accessibility snapshot |
| **shadcn** | `shadcn@4.21.4 mcp` | "Skill UI" — registry shadcn/ui, agent bisa cari & tambah komponen |

> Semua dijalankan via `npx` (stdio). Tidak ada instalasi global; `npx` mengunduh
> paster ter-pin saat pertama kali server dipanggil.

---

## 1. Sumber kebenaran & file turunan

`mcp.servers.json` di root adalah **canonical source** (tidak dibaca editor mana pun).
Tiap editor/agent membaca file turunannya sendiri karena **lokasi & key JSON berbeda**:

| Target | File (di repo = committed) | Key | Scope |
|---|---|---|---|
| Cursor | `.cursor/mcp.json` | `mcpServers` | project |
| Windsurf | `.windsurf/mcp.json` | `mcpServers` | project |
| VS Code (Copilot) | `.vscode/mcp.json` | `servers` + `inputs` | project |
| Claude Code | `.mcp.json` | `mcpServers` | project |
| Kiro | `.kiro/settings/mcp.json` | `mcpServers` | project |
| Codex | `~/.codex/config.toml` (contoh: `.codex/config.example.toml`) | `[mcp_servers.*]` TOML | **user/global** |
| Antigravity | `~/.antigravity/mcp_config.json` (via UI) | `mcpServers` | **user/global** |

**Shareable (ikut repo):** Cursor, Windsurf, VS Code, Claude Code, Kiro.
**Per-tool / global (tidak bisa di-commit):** Codex (TOML di home) & Antigravity (UI-driven).

> ⚠️ Satu file JSON **tidak** bisa dipakai ulang mentah lintas editor: VS Code memakai
> key `servers` (bukan `mcpServers`) dan format berbeda. Codex memakai TOML. Kalau salah
> satu server berubah, update `mcp.servers.json` lalu sinkronkan file turunan.

---

## 2. Kredensial (jangan commit secret)

- Context7 API key **opsional** (hanya rate limit). Daftar gratis: https://context7.com/dashboard
- Set lewat env var `CONTEXT7_API_KEY`:
  - Template ada di `.env.example` → salin ke `.env` (sudah di-`.gitignore`).
  - Config JSON hanya menyimpan **referensi** `${CONTEXT7_API_KEY}`, bukan nilai asli.
  - VS Code: pakai blok `inputs` → di-prompt aman saat start (disimpan di secret storage editor).
  - Codex: set via shell env atau blok `env` di `~/.codex/config.toml`.

Tanpa API key pun ketiga server tetap jalan (Context7 jatuh ke rate limit publik).

---

## 3. Cara tiap target membaca config & mengaktifkannya

### Cursor
Membaca `.cursor/mcp.json` otomatis. Buka **Settings → MCP** → ketiga server tampil →
toggle **Enabled**. Status hijau = terhubung.

### Windsurf
Membaca `.windsurf/mcp.json` (project) atau global `~/.codeium/windsurf/mcp_config.json`.
**Settings → Cascade → MCP Servers → Refresh**. Pastikan server muncul & aktif.

### VS Code (GitHub Copilot — agent mode)
Membaca `.vscode/mcp.json`. Buka file → klik **Start** di atas tiap server, atau
Command Palette → **MCP: List Servers**. Butuh Copilot agent mode aktif. Saat start
pertama, VS Code meminta Context7 API key (boleh dikosongkan).

### Claude Code
Membaca `.mcp.json` di root project otomatis saat `claude` dijalankan di folder ini.
Verifikasi: jalankan `claude` lalu ketik `/mcp` → daftar server + status.
(Alternatif tambah manual: `claude mcp add --scope project context7 -- npx -y @upstash/context7-mcp@4.2.0`.)

### Kiro
Membaca `.kiro/settings/mcp.json`. Buka panel **MCP** di Kiro → server tampil →
toggle `disabled: false` sudah di-set. Reload MCP jika perlu.

### Codex (OpenAI)
**Tidak** membaca file repo. Salin blok dari `.codex/config.example.toml` ke
`~/.codex/config.toml` (Windows: `%USERPROFILE%\.codex\config.toml`). Verifikasi:
`codex mcp list` (atau cek saat sesi `codex` dimulai).

### Antigravity (Google)
Config **global via UI**, bukan file repo. Buka **Manage MCP / Plugins → Add MCP server**
→ paste blok `mcpServers` dari `mcp.servers.json` (sama persis dengan Cursor). Tersimpan di
`~/.antigravity/mcp_config.json`. Reload setelah menyimpan.

---

## 4. Verifikasi MCP terdeteksi & berfungsi

**(a) Server mau start sendiri (smoke test, lepas dari editor):**
```bash
# Context7 — harus print daftar tools (resolve-library-id, query-docs) lalu idle
npx -y @upstash/context7-mcp@4.2.0 --help

# Playwright — print opsi CLI
npx @playwright/mcp@0.0.83 --help

# shadcn MCP — jalan di root project (butuh components.json)
npx shadcn@4.21.4 mcp --help
```
Kalau ketiganya jalan tanpa error = command/args benar.

**(b) Tool muncul di editor:**
- Setelah enable, panel MCP tiap editor harus menampilkan status **connected/hijau** dan
  jumlah tools > 0 untuk tiap server.
- Context7: tools `resolve-library-id`, `query-docs` (atau `get-library-docs`).
- Playwright: tools `browser_navigate`, `browser_snapshot`, `browser_click`, dst.
- shadcn: tools pencarian/penambahan komponen registry.

**(c) Tool benar-benar terpanggil (end-to-end):**
Minta agent sesuatu yang memicu tool:
- Context7: *"Cari dokumentasi neo4j-driver (session READ, executeRead). use context7"* → agent memanggil
  `resolve-library-id` → `query-docs` dan mengembalikan docs ter-update.
- Playwright: *"Buka localhost:3000 dan ambil snapshot aksesibilitasnya"* → agent memanggil
  `browser_navigate` + `browser_snapshot`.
- shadcn: *"Tambahkan komponen button dari shadcn registry"* → agent memakai tool shadcn.

Jika tool terpanggil dan mengembalikan hasil, MCP berfungsi end-to-end.

---

## 5. Troubleshooting

- **Server tak muncul**: pastikan editor di-reload setelah menulis config; cek Node ≥ 18
  (Context7) / Node ≥ 20 untuk tooling modern.
- **`npx` lambat/first-run**: unduhan paket pertama kali; jalankan smoke test (bagian 4a)
  sekali untuk cache.
- **Context7 rate-limited**: isi `CONTEXT7_API_KEY` di `.env` / prompt VS Code.
- **shadcn MCP error**: harus dijalankan dengan CWD = root project (ada `components.json`).
- **Windows & `npx`**: beberapa editor butuh `cmd /c npx ...`. Jika `command: "npx"` gagal,
  ganti ke `"command": "cmd", "args": ["/c", "npx", ...]`.

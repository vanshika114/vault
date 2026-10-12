# 🔐 Vault

> **Save anything. Find everything.**

Vault is a personal information storage app designed to keep your notes, links, and images organized in one place.

Everything is stored locally in your browser using **IndexedDB**, so your data stays on your device.

---

## ✨ Features

- 📝 **Text Notes** — Save titles, descriptions, tags, and content
- 🔗 **Links** — Store URLs with automatic domain extraction
- 🖼️ **Images** — Upload and organize images
- 🔎 **Full-Text Search** — Find information across your saved items
- 🗂️ **Filters** — Filter items by type or date
- ↕️ **Sorting** — Sort by newest or oldest
- ✏️ **Edit** — Modify saved items anytime
- 🗑️ **Delete** — Remove items with confirmation
- 🔐 **Account-less Sync** — Link devices with a private four-word vault code
- 🌙 **Dark Mode** — Switch between light and dark themes
- 📱 **Responsive** — Works across desktop and mobile
- 💾 **Local Storage** — Data persists using IndexedDB

---

## 🚀 Quick Start

1. Extract & Install

```bash
unzip vault-v1.zip
cd vault
npm install
``` 

2. Start the Development Server
npm run dev

Then open:

http://localhost:5174/


3. Start Using Vault
Action	What it does
Write	Create a text note
Paste Link	Save a URL
Upload Image	Add an image
Search	Find items by keyword
Filter	Filter by type or date
Sort	Sort by newest or oldest
Edit	Modify an existing item
Delete	Remove an item

🛠️ Tech Stack
Technology	Purpose
React 18	User interface
Vite	Development & build tooling
IndexedDB	Local browser storage
CSS Modules	Component-level styling


📦 Available Commands

Install dependencies
npm install

Start development server
npm run dev

Build for production
npm run build

Preview production build
npm run preview


🏗️ Production Build

Create an optimized production build with:

npm run build

This generates a dist/ folder containing the production-ready application.

The contents of dist/ can be deployed to a static web host.

🔎 How Search Works

Vault provides full-text search across your saved information.

Search can be used to find:

Titles
Descriptions
Tags
Note content
Saved URLs
Other searchable metadata


💾 Data & Privacy

Vault keeps a local copy in IndexedDB. When sync is configured, item data and image
blobs are encrypted in the browser with keys derived from your four-word vault code
before they are sent to the Cloudflare Worker. The server stores encrypted item
records in D1 and encrypted images in R2; it never receives the vault code or
decryption key.

Save the vault code somewhere safe. It is the only way to link another device, and
there is no account-based recovery. Clearing a browser's site data removes that
device's local copy; synced copies can be restored by opening the same code.

### Configure cross-device sync

1. From `vault-sync/`, create the D1 database with `npx wrangler d1 create vault-sync`
   and an R2 bucket with `npx wrangler r2 bucket create vault-sync-blobs`.
2. Replace the `database_id` in `vault-sync/wrangler.jsonc` with the ID printed
   for your D1 database.
3. From `vault-sync/`, apply the migration with
   `npx wrangler d1 migrations apply vault-sync --remote`, then deploy with
   `npm run deploy`.
4. Copy `.env.example` to `.env` and set `VITE_SYNC_URL` to the deployed Worker
   URL. Restart Vite after changing the environment file.

The Worker only accepts browser origins at `https://vault-ecru-ten.vercel.app`
and localhost Vite development origins on ports 5173 and 5174. Its rate limiter
allows 60 requests per IP per minute. For a different production domain, update
the Worker origin allowlist before deploying.


⚡ Performance
Build size: ~100 KB gzipped
Search: Instant local search
Storage: Browser-based IndexedDB
Animations: Optimized for smooth interaction
Rendering: Responsive across screen sizes

Performance figures may vary depending on browser, device, and stored data.


🌐 Browser Support

Vault is designed for modern versions of:

Chrome
Firefox
Safari
Edge

Also supports modern mobile browsers on:

iOS
Android

## 📁 Project Structure

```text
vault/
├── src/
│   ├── components/
│   ├── services/
│   ├── ...
│
├── public/
├── index.html
├── package.json
├── vite.config.js
└── ...

```

🔐 The Idea

Information gets scattered everywhere.

A note here.
A useful link there.
An image buried in a folder.

Vault brings those pieces into one personal space.

Simple storage.
Fast retrieval.
No unnecessary cloud dependency.

🚦 Ready to Go
unzip vault-v1.zip
cd vault
npm install
npm run dev

Happy vaulting! 🔐

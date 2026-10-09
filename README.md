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

# Build for production
npm run build

# Preview production build
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

Vault uses IndexedDB to persist data directly in the browser.

Your saved information is stored locally rather than being sent to a backend server.

Your vault stays in your browser.

Clearing your browser's site data may remove locally stored Vault data, so keep this in mind before clearing browser storage.


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

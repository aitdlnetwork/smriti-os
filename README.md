# SMRITI-OS | Intelligent ERP Redefined

**SMRITI-OS** is a high-performance, sovereign ERP and Retail Billing platform designed for modern enterprises that demand data ownership, offline-first reliability, and extreme performance. Built with a **"Memory, Not Code"** philosophy, Smriti-OS replaces legacy hardcoded logic with a dynamic, parameter-driven architecture.

---

## 🚀 Vision: "Memory, Not Code"
Smriti-OS is designed to achieve **100% functional parity with legacy enterprise systems like Tally and Shoper 9**, while delivering a modern, high-velocity user experience. By storing business logic, grid configurations, and validation rules in a sovereign database (SQLite WASM), the system enables runtime reconfiguration without code deployments.

---

## ✨ Key Features

### 🏦 Retail Billing Engine (Sales/Credit)
- **High-Velocity POS**: A keyboard-driven, high-density terminal designed for rapid item scanning and multi-mode settlement.
- **Credit Interlocks**: Integrated credit billing with real-time tracking of Credit Limits, Price Groups, and Salesman Commissions.
- **Dynamic HUD**: Real-time display of customer loyalty tiers (Platinum/Gold/Silver), tax routing (Inclusive/Exclusive), and regional destination codes (Local/Outstation).

### 📦 Master Catalogue Parity
- **Item Master**: Multi-tab entry engine for bulk SKU management with deep relational integrity.
- **Customer CRM**: Advanced customer profiling with automated GSIN mapping and credit permission controls.
- **Sales Personnel**: Detailed tracking of sales personnel with commission-trigger logic.
- **Universal Lookups**: Parameter-driven registries for Sizes, Brands, Classifications, and Sales Factors.

### 🏢 Procurement & Inventory
- **Goods Inward (GRN)**: Triple-quantity tracking (Scanning/Audit/Physical) with automated landed-cost pro-ration.
- **Stock Ledger**: Atomic data integrity across all inventory movements with real-time stock computation.

### 🎨 Prism Design System
- **Unified PageShell**: A premium, dark-themed UI featuring glassmorphism, modern typography (Inter/Roboto), and smooth micro-animations.
- **Sovereign Sidebar**: Persistent, role-based navigation with real-time system telemetry.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 14, React, TypeScript.
- **Database**: Sovereign SQLite WASM (Offline-First, Atomic Integrity).
- **Styling**: Vanilla CSS with Prism Design Tokens.
- **Integration**: TallyPrime Synchronization Bridge (Planned).

---

## 🛠️ Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/aitdlnetwork/smriti-os.git
   ```
2. **Install Dependencies**:
   ```bash
   cd frontend
   npm install
   ```
3. **Run in Development**:
   ```bash
   npm run dev
   ```
4. **Access the Terminal**:
   Open [http://localhost:3000](http://localhost:3000)

---

## 📝 License & Copyright
© 2024 **AITDL NETWORK**. All Rights Reserved.
Smriti-OS is a proprietary product of AITDL NETWORK. Unauthorized distribution or modification is strictly prohibited.

---

> [!TIP]
> Use keyboard shortcuts (F2-F10) for maximum efficiency in the Retail POS terminal.

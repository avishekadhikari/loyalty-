# Remix: Loyalty Nepal and Worldwide 🇳🇵🌍

A high-performance B2B2C loyalty and reward platform supporting local merchants in Nepal and globally. Seamlessly bridges businesses with their customers via unified digital dashboards, fast QR scan checkouts, and dynamic multi-currency rewards tracking.

Now backed by a high-availability, fully managed **Google Cloud SQL (PostgreSQL)** database integrated via **Drizzle ORM** for enterprise-grade performance and transactional safety.

---

## ✨ Features

- **📱 Customer Digital Wallet**: Real-time points tracking, digital loyalty stamp cards, transactions history, and QR-code self-enrollment.
- **💼 Business Dashboard**: Custom loyalty rules, point multiplier configurations, tier definitions, direct client messaging, real-time analytics, and visual customer segment graphs.
- **🔒 Secure Admin Portal**: Platform-wide ledger auditing, system health stats, exchange rate updates, and allowed language controllers.
- **🗺️ Global & Multi-Currency Ready**: Native support for exchange rates (NPR, USD, INR, etc.) and multilingual localization toggles (English, Nepali, Hindi).
- **🌀 Smooth Interactions**: High-fidelity interface styled with Tailwind CSS, custom frosted-glass elements, responsive layouts, and fluid motion-animated micro-interactions.
- **⚡ Full-Stack Sync Engine**: Robust Express server proxy with type-safe Cloud SQL state updates, automatic local JSON backups, and seamless seeding.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, [Vite](https://vite.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend**: Node.js, [Express](https://expressjs.com/), [tsx](https://github.com/privatenumber/tsx)
- **Database**: [Google Cloud SQL (PostgreSQL)](https://cloud.google.com/sql)
- **ORM & Migrations**: [Drizzle ORM](https://orm.drizzle.team/), [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)

---

## 📐 Project Structure

```text
├── assets/                  # Public assets and media
├── backend/                 # Full-stack backend server
│   ├── db/
│   │   ├── index.ts         # Cloud SQL connection pool configuration
│   │   └── schema.ts        # Database schema definitions
│   └── index.ts             # Express server and API routes
├── frontend/                # Modern SPA React application
│   ├── components/          # Dashboard panels (Admin, Merchant, Customer, Marketing)
│   ├── App.tsx              # Main application router and shell
│   ├── index.css            # Tailwind CSS global styles and design variables
│   ├── main.tsx             # React SPA entry mount point
│   ├── translations.ts      # Multi-language dictionary rules
│   └── types.ts             # Shared frontend type interfaces
├── src/                     # Infrastructure configuration folder
│   └── db/
│       ├── drizzle.config.ts# Drizzle Kit CLI configuration
│       └── schema.ts        # Main schema source of truth for cloud syncs
├── db.json                  # Local JSON dataset backup (automatic graceful fallback)
├── metadata.json            # AI Studio applet manifest
├── package.json             # NPM dependencies, building, and runner scripts
└── tsconfig.json            # TypeScript engine rules
```

---

## 🚀 Getting Started

### 1. Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v18 or higher) installed.

### 2. Installation

Clone this repository and install all required frontend and backend dependencies:

```bash
npm install
```

### 3. Setup Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Define your database credentials and API secrets:

```env
# Google Cloud SQL Credentials
SQL_HOST="127.0.0.1"
SQL_DB_NAME="your_db_name"
SQL_USER="your_db_user"
SQL_PASSWORD="your_db_password"

# Optional Cloud SQL Admin Settings
SQL_ADMIN_USER="ai_studio_admin"
SQL_ADMIN_PASSWORD="your_admin_password"

# Miscellaneous API Configurations
GEMINI_API_KEY="your_gemini_key_here"
```

### 4. Database Migrations

Deploy database schemas to Cloud SQL with Drizzle:

```bash
# Push schema updates safely
npx drizzle-kit push
```

### 5. Running the Application

To start the full-stack development environment:

```bash
npm run dev
```

The application will run at [http://localhost:3000](http://localhost:3000).

---

## 🏗️ Production Compilation

To compile both the React client assets and bundle the Express server for highly performant container deployments:

```bash
# Build React client and bundle Node server
npm run build

# Start the compiled production server
npm run start
```

---

*This project was developed and deployed in Google AI Studio.*

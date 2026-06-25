# Remix: Loyalty Nepal and Worldwide 🇳🇵🌍

A high-performance B2B2C loyalty and reward platform supporting merchants in Nepal and globally. Seamlessly bridges local businesses with their customers via unified digital dashboards, fast QR scan checkouts, and dynamic rewards tracking.

---

## ✨ Features

- **📱 Customer Digital Wallet**: Real-time points tracking, digital loyalty stamp cards, transaction history, and QR-code self-enrollment.
- **💼 Business Dashboard**: Custom loyalty rules, tier configurations, direct client messaging, real-time analytics, and customer segment graphs.
- **🔒 Secure Admin Portal**: Ledger auditing, system health stats, rate-limit controllers, and global platform security gates.
- **🌀 Smooth Interactions**: High-fidelity interface styled with Tailwind CSS, custom frosted-glass elements, responsive layouts, and motion-animated micro-interactions.
- **⚡ Full-Stack Real-Time Synced Core**: Express server proxy with type-safe state tracking, QR nonce authentication, and Gemini AI readiness.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, [Vite](https://vite.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend**: Node.js, [Express](https://expressjs.com/), [tsx](https://github.com/privatenumber/tsx)
- **Compilation & Bundling**: [esbuild](https://esbuild.github.io/)

---

## 🚀 Getting Started

### 1. Prerequisites

Make sure you have [Node.js](https://nodejs.org/) (v18 or higher) installed.

### 2. Installation

Clone this repository and install the dependencies:

```bash
# Install dependencies
npm install
```

### 3. Setup Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Define your secrets inside `.env`:
```env
GEMINI_API_KEY="your_gemini_key_here"
APP_URL="your_app_url_here"
```

### 4. Run Development Server

Start the full-stack development environment:

```bash
npm run dev
```

The application will be running at [http://localhost:3000](http://localhost:3000).

### 5. Production Build

To bundle the client-side SPA assets and compile the TypeScript Express server for production:

```bash
npm run build
```

The production output is built into the `dist/` folder. Start the compiled production app via:

```bash
npm run start
```

---

## 📐 Project Structure

```text
├── assets/             # Assets and media
├── src/
│   ├── components/     # Customer, Business, and Admin panels
│   ├── types.ts        # Common type definitions
│   ├── index.css       # Tailwind configuration and frosted glass utilities
│   ├── main.tsx        # React mounting entry point
│   └── App.tsx         # Main application controller
├── server.ts           # Full-stack Express server
├── metadata.json       # Applet permissions and settings
├── package.json        # Project dependencies and build tasks
└── tsconfig.json       # TypeScript compiler settings
```

---

*This project was initiated in Google AI Studio.*

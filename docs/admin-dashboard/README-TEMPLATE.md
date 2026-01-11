# ENEOS Admin Dashboard

> Internal admin dashboard for ENEOS Thailand Sales Automation system.
> Monitor leads, track sales performance, and export reports.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)
![License](https://img.shields.io/badge/License-Private-red)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Available Scripts](#-available-scripts)
- [Environment Variables](#-environment-variables)
- [Authentication](#-authentication)
- [API Integration](#-api-integration)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Documentation](#-documentation)
- [Contributing](#-contributing)

---

## ✨ Features

- **Dashboard Overview** - KPIs, trends, alerts at a glance
- **Lead Management** - View, search, filter all leads
- **Sales Performance** - Track team performance metrics
- **Campaign Analytics** - Monitor email campaign results
- **Data Export** - Export to Excel/PDF
- **Responsive Design** - Works on desktop, tablet, mobile
- **Secure Access** - Google OAuth with @eneos.co.th restriction

---

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) |
| Charts | [Tremor](https://www.tremor.so/) |
| Data Fetching | [TanStack Query](https://tanstack.com/query) |
| Tables | [TanStack Table](https://tanstack.com/table) |
| Authentication | [NextAuth.js](https://next-auth.js.org/) |
| Icons | [Lucide React](https://lucide.dev/) |
| Testing | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) |

---

## 📦 Prerequisites

Before you begin, ensure you have:

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Google Cloud Project** with OAuth 2.0 configured
- **Backend API** running (eneos-sales-automation)

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/eneos-thailand/admin-dashboard.git
cd admin-dashboard
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup environment variables

```bash
# Copy example file
cp .env.example .env.local

# Edit with your values
nano .env.local
```

Required variables:
- `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- `NEXT_PUBLIC_API_URL` - Backend API URL

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 📁 Project Structure

```
admin-dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth pages (login)
│   │   ├── (dashboard)/       # Protected pages
│   │   ├── api/               # API routes
│   │   └── layout.tsx         # Root layout
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── dashboard/         # Dashboard components
│   │   ├── leads/             # Leads components
│   │   ├── layout/            # Layout components
│   │   └── shared/            # Shared components
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities & config
│   ├── types/                 # TypeScript types
│   ├── constants/             # App constants
│   └── __tests__/             # Test files
├── public/                    # Static assets
├── .env.example              # Environment template
└── package.json
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 3001) |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run type-check` | Run TypeScript compiler |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Generate coverage report |
| `npm run test:e2e` | Run E2E tests |

---

## 🔐 Environment Variables

See [.env.example](.env.example) for all available variables.

### Required

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | App URL (http://localhost:3001) |
| `NEXTAUTH_SECRET` | Secret for token encryption |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `NEXT_PUBLIC_API_URL` | Backend API URL |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_ENABLE_EXPORT` | Enable export feature | `true` |
| `NEXT_PUBLIC_DEBUG` | Enable debug mode | `false` |

---

## 🔑 Authentication

This dashboard uses **Google OAuth 2.0** with domain restriction.

- Only `@eneos.co.th` emails can sign in
- Sessions last 24 hours
- JWT tokens stored in httpOnly cookies

### Setup Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add authorized origins: `http://localhost:3001`
4. Add redirect URI: `http://localhost:3001/api/auth/callback/google`
5. Copy credentials to `.env.local`

---

## 🔌 API Integration

This dashboard connects to the **eneos-sales-automation** backend.

### Required Backend Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/dashboard` | GET | Dashboard summary |
| `/api/admin/leads` | GET | List leads |
| `/api/admin/leads/:id` | GET | Lead detail |
| `/api/admin/sales-performance` | GET | Sales metrics |
| `/api/admin/campaigns` | GET | Campaign data |
| `/api/admin/export` | GET | Export data |

See [api-specification.md](docs/api-specification.md) for details.

---

## 🧪 Testing

### Unit Tests (Vitest)

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Install browsers
npx playwright install

# Run tests
npm run test:e2e

# UI mode
npm run test:e2e:ui
```

### Coverage Targets

- Statements: >= 80%
- Branches: >= 80%
- Functions: >= 80%
- Lines: >= 80%

---

## 🚢 Deployment

### Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3001
ENV PORT 3001
CMD ["node", "server.js"]
```

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE-CONTEXT.md](docs/CLAUDE-CONTEXT.md) | Quick reference for developers |
| [architecture.md](docs/architecture.md) | System architecture |
| [technical-design.md](docs/technical-design.md) | Implementation details |
| [ux-ui.md](docs/ux-ui.md) | Design system & components |
| [api-specification.md](docs/api-specification.md) | API documentation |
| [security.md](docs/security.md) | Security guidelines |
| [testing-strategy.md](docs/testing-strategy.md) | Testing approach |

---

## 🤝 Contributing

1. Create a feature branch from `develop`
2. Make your changes
3. Run tests and linting
4. Submit a Pull Request

```bash
# Create branch
git checkout -b feature/your-feature develop

# Run checks before commit
npm run lint
npm run type-check
npm test

# Commit with conventional commits
git commit -m "feat: add new feature"
```

---

## 📝 License

Private - ENEOS Thailand. All rights reserved.

---

## 👥 Team

- **Development**: Claude Code
- **Product Owner**: ENEOS Thailand
- **Last Updated**: January 2024

# Smart Finance — Multilingual Personal Finance Management Application

A complete, production-ready, multilingual personal finance and debt management application built with **Next.js 14**, **React 18**, **TypeScript**, **Tailwind CSS**, and **SQLite**.

---

## 🌟 Key Features

### 1. Mandatory Three-Language Support (English, Uzbek, Russian)
- **English (`en`)**: Default interface language.
- **Uzbek (`uz`)**: Natural Uzbek Latin script (`so‘m`, `o‘`, `g‘`, `Xarajatlar`, `Daromadlar`, `Byudjetlar`, `Qarzlar`).
- **Russian (`ru`)**: Natural, grammatically correct Russian translations throughout.
- **Language Switcher**: Available on the top navigation bar, onboarding screen, login screen, and settings.
- **Persistence**: Selected language persists across sessions and is saved in user preferences in the database.
- **No Hardcoded Strings**: All user-facing strings are loaded from centralized locale resources (`locales/en.json`, `locales/uz.json`, `locales/ru.json`).
- **Automated Notifications**: In-app notifications, budget warnings, and debt repayment reminders are generated in all three languages.

### 2. Currency & Regional Settings
- **Default Currency**: Uzbekistani soʻm (`UZS`) formatted locale-aware (e.g., `10 000 UZS`, `10 000 so‘m`, `10 000 сумов`).
- **Multi-currency Options**: Configurable preference for `UZS`, `USD`, `EUR`, `RUB`.
- **Configurable Timezones**: Local calendar calculation for daily budgets, transaction resets, and reminders (default `Asia/Tashkent`).

### 3. Authentication & Strict Data Isolation
- Complete registration, login, logout, password reset, and account deletion flows.
- Hashed passwords using `bcryptjs` and secure stateless JWT sessions.
- **Strict User Data Isolation**: Every database query and API endpoint enforces `user_id` authentication. Users cannot view, modify, or delete another user's financial records.

### 4. Expense & Income Tracking
- **Two Entry Modes**:
  1. **Structured Form**: Amount, category picker with icons, transaction date, payment method (Cash, Card, Bank Transfer, Other), and optional notes.
  2. **Smart Universal Input (NLP)**: Universal natural language sentence entry in English, Uzbek, and Russian:
     - *"I spent 10,000 UZS on bread today."*
     - *"Bugun nonga 10 000 so‘m sarfladim."*
     - *"Сегодня я потратил 10 000 сумов на хлеб."*
     - *"I received 3,000,000 UZS as my salary."*
     - *"Shohruhga 100 000 qarz berdim"*
     - Interactive **Confirmation Preview** with auto-detected category, amount, date, and ambiguity alert before saving.
- Filtering by period (Today, Yesterday, This Week, This Month, This Year, Custom Range), category, and live search.

### 5. Double-Entry Financial Accounting
- **No Double Counting**:
  - Money lent reduces available cash and increases receivables (NOT counted as an expense).
  - Money borrowed increases available cash and increases liabilities (NOT counted as income).
  - Repaying loan principal updates cash and reduces outstanding balance without distorting earned income or regular expenses.
  - Clear distinction between Opening Balance, Net Cash Flow, and Available Balance.

### 6. Budgets & Spending Limits
- Daily, weekly, monthly, and category-specific spending limits.
- Color-coded progress indicators:
  - **0–69%**: Normal (Green)
  - **70–89%**: Warning threshold (Amber)
  - **90–99%**: Critical warning (Orange/Rose)
  - **100%+**: Limit exceeded (Red)
- Configurable warning thresholds (50%–95%).
- Automated in-app notifications generated upon reaching 90% or exceeding 100%.

### 7. Debt Management & Partial Repayments
- Support for both:
  - **Money Lent (Receivables)**: Debtor name, original principal, amount repaid, outstanding balance, due date, status.
  - **Money Borrowed (Liabilities)**: Lender name, amount borrowed, amount repaid, outstanding balance, due date, status.
- **Partial Repayments**: Multi-step repayments with complete audit history and automatic balance recalculation.
- Statuses: `active`, `partially_repaid`, `fully_repaid`, `overdue`.

### 8. Recurring Transactions
- Recurring income (salary) and recurring expenses (rent, subscriptions, internet).
- Frequencies: Daily, Weekly, Monthly, Yearly.
- Duplicate prevention engine with last-processed date tracking.
- "Process Due Now" one-click runner.

### 9. Notifications & Scheduled Reminders
- Deduplicated notifications for budget warnings (80%, 90%, 100%) and debt due/overdue alerts.
- Configurable preferences for each alert type and reminder lead time.
- Mark all as read and clear history.

### 10. Financial Reports, Analytics & Data Export
- Comprehensive reports for today, yesterday, week, month, year, and custom dates.
- Category breakdown with visual shares and percentages.
- Comparison against previous periods (% change).
- Average daily spending and top 5 largest expenses.
- One-click **CSV export** and **JSON full data export**.
- Printable/PDF report view.

---

## 🛠 Technology Stack

- **Frontend Framework**: Next.js 14 (App Router)
- **UI & Styling**: React 18, Tailwind CSS, Lucide React icons
- **Database Engine**: Built-in SQLite (`DatabaseSync` / SQLite with WAL mode & foreign keys)
- **Authentication**: `bcryptjs` for password hashing, `jsonwebtoken` for secure JWT tokens
- **Internationalization**: Custom zero-overhead i18n engine with full locales (`en`, `uz`, `ru`)
- **Testing**: Built-in Node.js Test Runner (`node --test`)

---

## 📁 Project Structure

```
├── data/                       # SQLite database storage (auto-created)
├── locales/                    # Root translation files
│   ├── en.json                 # English translations
│   ├── uz.json                 # Uzbek translations
│   └── ru.json                 # Russian translations
├── src/
│   ├── app/                    # Next.js App Router pages and APIs
│   │   ├── api/                # Production REST API endpoints
│   │   │   ├── auth/           # Register, Login, Logout, Profile, Password, Export, Delete
│   │   │   ├── budgets/        # Spending limits API
│   │   │   ├── categories/     # Default and custom categories API
│   │   │   ├── dashboard/      # Financial metrics & charts API
│   │   │   ├── debts/          # Debt tracking & partial repayments API
│   │   │   ├── nlp/            # Natural language transaction parser API
│   │   │   ├── notifications/  # Notification history & background checks API
│   │   │   ├── recurring/      # Recurring schedules & processor API
│   │   │   ├── reports/        # Analytics & financial reports API
│   │   │   └── transactions/   # Expenses & income transactions API
│   │   ├── budgets/            # Budgets page
│   │   ├── debts/              # Debts page
│   │   ├── expenses/           # Expenses page
│   │   ├── income/             # Income page
│   │   ├── login/              # Login page
│   │   ├── notifications/      # Notifications page
│   │   ├── recurring/          # Recurring transactions page
│   │   ├── register/           # Registration page
│   │   ├── reports/            # Reports & Analytics page
│   │   ├── reset-password/     # Password reset page
│   │   └── settings/           # Regional & security settings page
│   ├── components/             # Reusable UI components
│   │   ├── layout/AppShell.tsx # Responsive desktop sidebar & mobile bottom bar
│   │   └── transactions/QuickAddModal.tsx # Smart Universal & Structured Modal
│   ├── context/LanguageContext.tsx # Context for language, theme, and user state
│   ├── lib/
│   │   ├── accounting.ts       # Atomic financial calculations & budget logic
│   │   ├── auth.ts             # Password hashing, JWT signing & isolation
│   │   ├── db.ts               # Database initialization & category seed
│   │   ├── i18n.ts             # Internationalization and currency formatting
│   │   ├── nlp.ts              # EN/UZ/RU natural language transaction parser
│   │   └── notifications.ts    # Deduplicated notification generator
│   └── locales/                # Bundled locale JSON resources
└── tests/                      # Automated test suite
    ├── accounting.test.mjs     # Financial accounting tests
    ├── auth_isolation.test.mjs # Multi-user isolation & security tests
    ├── budgets_notifications.test.mjs # Budget thresholds & deduplication
    ├── e2e_api.test.mjs        # End-to-end integration lifecycle test
    ├── i18n.test.mjs           # Locale coverage & currency formatting tests
    └── nlp.test.mjs            # Natural language parsing tests
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Configuration parameters:

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment mode (`development` or `production`) | `development` |
| `JWT_SECRET` | Secret key used for signing JWT auth tokens | Secure random string |
| `DATABASE_PATH` | Path to the SQLite database file | `data/smart_finance.db` |
| `NEXT_PUBLIC_APP_URL` | Public URL for the application | `http://localhost:3000` |

---

## 🚀 Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Test Suite
```bash
npm test
```
All 6 test suites will run and verify:
- Financial accounting rules (no double counting of loans)
- Natural language parsing in English, Uzbek, and Russian
- Full translation coverage across all 3 languages
- Security & strict user data isolation
- Budget threshold calculations & notification deduplication
- End-to-end user lifecycle

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build and Run Production Bundle
```bash
npm run build
npm start
```

---

## 🧪 Automated Test Results

The test suite covers all critical business logic and runs in under 400ms:

```
✔ Accounting Rules: Loan accounting without double-counting and accurate cash-flow (2.6ms)
✔ Security & User Data Isolation: Users cannot access or tamper with other users data (3.4ms)
✔ Budgets & Deduplicated Notification Generation (2.7ms)
✔ End-to-End Integration: Complete Financial Lifecycle & Multi-User Isolation (43.2ms)
✔ i18n: Complete translation coverage in en, uz, and ru (31.0ms)
✔ NLP Transaction Parser: English, Uzbek, and Russian inputs (34.0ms)

ℹ tests 6
ℹ pass 6
ℹ fail 0
```

---

## 🌐 Production Deployment

Smart Finance is configured for instant deployment to any Node.js environment, Docker container, or cloud host (Vercel, Railway, Render, VPS):

1. **Standalone / VPS**:
   ```bash
   npm run build
   npm start
   ```
2. **PostgreSQL / Supabase Migration**:
   The database schema is fully ANSI SQL compliant. To use PostgreSQL or Supabase, point the queries or use an ORM adapter with PostgreSQL connection string in `src/lib/db.ts`.

# RiskIQ — AI-Powered Insurance Underwriting Platform

<div align="center">

![RiskIQ](https://img.shields.io/badge/RiskIQ-Insurance%20Platform-0ea5e9?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=for-the-badge&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss)

**A full-stack, multi-tenant motor insurance underwriting platform with automated risk scoring, rule-based decisions, and real-time analytics.**

</div>

---

## Table of Contents

- [Overview](#overview)
- [Live Features at a Glance](#live-features-at-a-glance)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How the App Works](#how-the-app-works)
- [User Roles & Permissions](#user-roles--permissions)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Database Schema](#database-schema)
- [Core Engines](#core-engines)
- [API Reference](#api-reference)
- [Application Workflow (End-to-End)](#application-workflow-end-to-end)
- [Pages & Routes](#pages--routes)
- [Scripts](#scripts)

---

## Overview

RiskIQ is a **B2B SaaS platform** for motor insurance companies. It digitizes the entire insurance application and underwriting lifecycle — from application intake to automated risk scoring, rule-based decisions, premium calculation, quote generation, and PDF delivery.

**Who uses it?**

| Actor | What they do |
|---|---|
| **Agent** | Submits applications on behalf of applicants |
| **Underwriter** | Reviews referred applications, overrides decisions |
| **Admin** | Manages rules, views reports and audit trail |
| **Compliance Officer** | Reads audit logs and reports |
| **Super Admin** | Full access across all modules |

---

## Live Features at a Glance

<details>
<summary><strong>Application Management</strong> — click to expand</summary>

- 6-step progressive application form (Applicant → Vehicle → Driving History → Coverage → Documents → Review)
- **Auto-save every 30 seconds** as draft — resumes automatically on re-open
- Per-step Zod validation with smooth Framer Motion transitions between steps
- Document upload to private Supabase Storage with signed upload URLs
- Applicants tracked per agent (agents only see their own submissions)

</details>

<details>
<summary><strong>Automated Risk Scoring Engine</strong> — click to expand</summary>

A **6-factor weighted model** produces a score from 0 (lowest risk) to 100 (highest risk):

| Factor | Weight |
|---|---|
| Age Factor | 15% |
| Driving Experience | 20% |
| Traffic Violations / DUI | 25% |
| Claims History / At-Fault Accidents | 20% |
| Vehicle Age & Type | 10% |
| Income Factor | 10% |

The score drives both the decision engine and premium loading.

</details>

<details>
<summary><strong>Rules-Based Decision Engine</strong> — click to expand</summary>

9 configurable rules evaluated in priority order. Admins can toggle any rule on/off from the UI.

**Decline rules (applied first):**
- DUI conviction in the last 2 years → **Decline**
- 3 or more at-fault accidents → **Decline**
- Vehicle older than 20 years → **Decline**
- Risk score > 85 → **Decline**

**Refer rules:**
- Risk score between 70–85 → **Refer**
- Vehicle modifications present → **Refer**
- IDV > ₹25 Lakhs → **Refer**
- Claim in the last 12 months → **Refer**

**Approve rule:**
- Risk score < 70 (and no decline/refer triggers) → **Approve**

</details>

<details>
<summary><strong>Dynamic Premium Calculator</strong> — click to expand</summary>

- Base rate derived from vehicle age (2.5% – 5.2% of IDV)
- Risk loading added proportional to the risk score
- NCB (No Claim Bonus) discount tiers: 0%, 20%, 25%, 35%, 45%, 50%
- 5 optional add-ons: Zero Depreciation, Roadside Assistance, Engine Protection, Consumable Cover, Return to Invoice

</details>

<details>
<summary><strong>Quote Management & PDF Delivery</strong> — click to expand</summary>

- Quotes auto-generated when an application is approved or referred
- Interactive quote panel: agents can switch coverage type and toggle add-ons with live premium recalculation
- Accept or request changes on a quote
- Download quote as PDF — generated server-side using `@react-pdf/renderer`
- Signed PDF links (HMAC-SHA256) generated per quote for secure, authenticated-only downloads

</details>

<details>
<summary><strong>Underwriting Queue</strong> — click to expand</summary>

- Prioritized queue of all `referred` applications, sorted oldest-first
- SLA timer per case, color-coded:
  - **Green** — waiting < 2 hours
  - **Yellow** — waiting < 4 hours
  - **Red** — SLA breached (4+ hours)
- Manual approve / decline / re-refer with mandatory reason text

</details>

<details>
<summary><strong>AI Underwriting Assistant (Claude) — Partially Implemented</strong> — click to expand</summary>

> **Note:** The AI assistant UI and API route are built and wired up, but the feature is **not fully operational** yet. The `ANTHROPIC_API_KEY` must be configured and the integration requires further testing before it can be used reliably in production.

- Floating chat panel available on every application detail page (UI complete)
- Designed to be powered by **Anthropic Claude 3.5 Sonnet** with streaming responses
- Application data is intended to be injected into the system prompt for context-aware answers
- 5 quick-suggestion chips present in the UI: summarize risk, explain score, recommend decision, list red flags, estimate premium
- Streaming response plumbing is in place (`/api/ai-assistant` route) but requires a valid Anthropic API key to function

</details>

<details>
<summary><strong>Reports & Analytics</strong> — click to expand</summary>

- **STP Rate** (Straight-Through Processing — auto-approved without manual review)
- Average processing time across all applications
- Total premium written
- Daily application volume bar chart
- Decision breakdown pie chart (Approved / Referred / Declined)
- Weekly revenue trend bar chart
- Top 5 most-triggered underwriting rules

</details>

<details>
<summary><strong>Full Audit Trail</strong> — click to expand</summary>

Every state change is logged with:
- Action type (e.g. `PROCESS_APPLICATION`, `MANUAL_DECISION`, `QUOTE_ACCEPTED`)
- Entity type + ID
- Who performed it (system or user)
- Old value JSON vs. new value JSON diff
- Filterable by action type and searchable. Paginated (last 25 of all records shown at once)
- Accessible to compliance officers and admins only

</details>

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org) (App Router, React Server Components) |
| **Language** | TypeScript 5 (strict mode) |
| **Database & Auth** | [Supabase](https://supabase.com) — PostgreSQL + Supabase Auth (cookie-based sessions) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) + CSS variables for theming |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://radix-ui.com) primitives |
| **Forms** | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| **Charts** | [Recharts](https://recharts.org) |
| **PDF Generation** | [@react-pdf/renderer](https://react-pdf.org) |
| **Animations** | [Framer Motion](https://motion.dev) |
| **Icons** | [Lucide React](https://lucide.dev) |
| **Notifications (UI)** | [react-hot-toast](https://react-hot-toast.com) |
| **AI (partial)** | [Anthropic Claude 3.5 Sonnet](https://anthropic.com) — wired up, not fully operational |
| **Dark Mode** | [next-themes](https://github.com/pacocoursey/next-themes) |
| **Package Manager** | pnpm |
| **Fonts** | DM Sans (body), Syne (headings) via `next/font/google` |

---

## Project Structure

```
riskiq/
├── app/
│   ├── layout.tsx                  # Root layout — fonts, ThemeProvider
│   ├── page.tsx                    # Public landing/marketing page
│   ├── providers.tsx               # next-themes ThemeProvider wrapper
│   ├── globals.css
│   │
│   ├── (auth)/                     # Auth routes (no dashboard layout)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   │
│   ├── (dashboard)/                # Protected routes (session-guarded)
│   │   ├── layout.tsx              # Session check + profile fetch
│   │   ├── dashboard/page.tsx
│   │   ├── applications/
│   │   │   ├── page.tsx            # List view
│   │   │   ├── new/page.tsx        # 6-step form
│   │   │   └── [id]/page.tsx       # Detail + tabs
│   │   ├── quotes/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── underwriting/
│   │   │   ├── page.tsx            # Queue
│   │   │   └── [id]/page.tsx
│   │   ├── rules/page.tsx
│   │   ├── reports/page.tsx
│   │   └── audit/page.tsx
│   │
│   └── api/
│       ├── ai-assistant/route.ts   # Claude streaming endpoint
│       └── quotes/[id]/pdf/route.tsx  # PDF generation endpoint
│
├── components/
│   ├── ai/UnderwritingAssistant.tsx
│   ├── applications/
│   ├── dashboard/
│   ├── forms/ApplicationForm.tsx   # 6-step form (960 lines)
│   ├── layout/                     # Sidebar, Header, Breadcrumbs…
│   ├── marketing/LandingPage.tsx
│   ├── quotes/
│   ├── reports/
│   └── ui/                         # 25 shadcn/ui components
│
├── actions/                        # Next.js Server Actions
│   ├── auth.ts
│   ├── process-application.ts      # Core orchestration action
│   ├── underwriting.ts
│   ├── documents.ts
│   └── storage.ts
│
├── lib/
│   ├── supabase/                   # client / server / admin / middleware
│   ├── risk-engine/                # scorer.ts + types.ts
│   ├── decision-engine/            # rules.ts + processor.ts
│   ├── premium-calculator/         # calculator.ts + rate-tables.ts
│   ├── quotes/
│   └── validators/
│
├── types/index.ts                  # All shared TypeScript types
├── middleware.ts                   # Session refresh for all protected routes
├── AGENTS.md                       # AI agent build specification
├── .env.local                      # Environment variables
├── next.config.ts
├── tailwind.config.ts
└── components.json                 # shadcn/ui config
```

---

## How the App Works

```
Applicant (via Agent)
        │
        ▼
  ┌─────────────────────┐
  │  6-Step Form         │  ← Auto-saves as draft every 30s
  │  (ApplicationForm)   │
  └──────────┬──────────┘
             │  Submit
             ▼
  ┌─────────────────────────────────────────────┐
  │          processApplication() server action  │
  │                                             │
  │  1. Risk Engine  → score (0–100)             │
  │  2. Decision Engine → Approve/Refer/Decline  │
  │  3. Premium Calculator → final premium (₹)  │
  │  4. Create Quote record                      │
  │  5. Write to audit_logs                      │
  └───────────────┬─────────────────────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
   APPROVED              REFERRED
       │                     │
       ▼                     ▼
  Quote ready        Underwriting Queue
  (PDF available)    (SLA-timed, manual review)
                           │
                    Underwriter reviews
                           │
                    Approve / Decline / Re-refer
                           │
                    In-app notification created
```

---

## User Roles & Permissions

| Role | Applications | Quotes | Underwriting Queue | Rules | Reports | Audit |
|---|---|---|---|---|---|---|
| `agent` | Own only | Own only | — | — | — | — |
| `underwriter` | All in org | All in org | Full access | Read | Read | — |
| `admin` | All in org | All in org | Full access | Full access | Full access | Read |
| `compliance_officer` | All in org | All in org | — | Read | Read | Full access |
| `super_admin` | All in org | All in org | Full access | Full access | Full access | Full access |

Navigation items in the sidebar are filtered per role. Pages redirect unauthorized users away.

---

## Setup & Installation

### Prerequisites

- **Node.js** v18 or higher
- **pnpm** (recommended) — install with `npm install -g pnpm`
- A **Supabase** project (free tier works)
- An **Anthropic** API key (optional — required only to use the AI assistant feature, which is partially implemented)

---

### Step 1 — Clone the Repository

```bash
git clone <your-repo-url>
cd riskiq
```

### Step 2 — Install Dependencies

```bash
pnpm install
```

### Step 3 — Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Once the project is ready, open **Project Settings → API** and copy:
   - **Project URL**
   - **anon / public key**
   - **service_role key** (keep this secret — never expose it client-side)

3. Open the **SQL Editor** in your Supabase dashboard and run the schema below (see [Database Schema](#database-schema)).

### Step 4 — Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local   # if example exists, otherwise create manually
```

Fill in all values — see [Environment Variables](#environment-variables).

### Step 5 — Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 6 — Create Your First Account

1. Navigate to `/register`
2. Fill in your **organization details** (insurance company name, license number, state, phone)
3. Fill in your **account details** (name, email, password)
4. You will be signed in and redirected to the dashboard

> **Note:** The first registered user gets the `admin` role by default. You can create additional users with different roles from the Supabase dashboard by inserting rows into the `profiles` table with the desired `role` value.

---

## Environment Variables

Create a `.env.local` file at the project root with the following variables:

```env
# ── Supabase ──────────────────────────────────────────────────────────
# Public variables — safe to expose in the browser
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# App base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Secret — only used in server actions and API routes, NEVER on the client
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# ── PDF Quote Sharing ─────────────────────────────────────────────────
# A random secret string used to sign quote download links
QUOTE_SHARE_SECRET=<any-long-random-string>

# ── AI Assistant (Anthropic) — optional, feature is partially implemented ──
ANTHROPIC_API_KEY=sk-ant-<your-anthropic-api-key>
```

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/publishable key |
| `NEXT_PUBLIC_APP_URL` | Yes | Base URL for the application |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for server-side admin operations |
| `QUOTE_SHARE_SECRET` | Yes | HMAC secret for signed PDF download URLs |
| `ANTHROPIC_API_KEY` | Optional | Anthropic key — required only for the AI assistant (partially implemented) |

> **Security note:** `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are only ever read in server-side code (`actions/`, `app/api/`). They are never sent to the browser.

---

## Database Schema

Run the following SQL in your **Supabase SQL Editor** to create all tables, enums, indexes, RLS policies, and triggers.

<details>
<summary><strong>Show full schema SQL</strong></summary>

```sql
-- ── Enums ──────────────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('super_admin','admin','underwriter','agent','compliance_officer');
CREATE TYPE app_status AS ENUM ('draft','submitted','processing','approved','referred','declined','cancelled');
CREATE TYPE product_type AS ENUM ('motor_private','motor_commercial','two_wheeler');
CREATE TYPE risk_level AS ENUM ('low','medium','high','very_high');
CREATE TYPE coverage_type AS ENUM ('third_party','comprehensive','own_damage');
CREATE TYPE decision_type AS ENUM ('approve','refer','decline');
CREATE TYPE doc_type AS ENUM ('driving_license','vehicle_registration','insurance_previous','aadhar','pan','income_proof','other');
CREATE TYPE notification_type AS ENUM ('application_submitted','application_approved','application_referred','application_declined','quote_ready','quote_accepted','document_required','system');

-- ── Organizations ───────────────────────────────────────────────────────
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  state TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Profiles (extends auth.users) ──────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'agent',
  organization_id UUID REFERENCES organizations(id),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Application Number Generator ───────────────────────────────────────
CREATE SEQUENCE application_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_application_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.application_number := 'APP-' || EXTRACT(YEAR FROM now()) || '-' || LPAD(nextval('application_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Applications ────────────────────────────────────────────────────────
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number TEXT UNIQUE,
  status app_status DEFAULT 'draft',
  product_type product_type,
  applicant_name TEXT,
  applicant_email TEXT,
  applicant_phone TEXT,
  applicant_dob DATE,
  applicant_age INTEGER,
  annual_income NUMERIC,
  vehicle_details JSONB DEFAULT '{}',
  driving_history JSONB DEFAULT '{}',
  coverage_selection JSONB DEFAULT '{}',
  raw_form_data JSONB DEFAULT '{}',
  organization_id UUID REFERENCES organizations(id),
  submitted_by UUID REFERENCES profiles(id),
  assigned_to UUID REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER set_application_number
  BEFORE INSERT ON applications
  FOR EACH ROW EXECUTE FUNCTION generate_application_number();

CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_org ON applications(organization_id);
CREATE INDEX idx_applications_submitted_by ON applications(submitted_by);
CREATE INDEX idx_applications_submitted_at ON applications(submitted_at);

-- ── Risk Scores ─────────────────────────────────────────────────────────
CREATE TABLE risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  overall_score NUMERIC NOT NULL,
  risk_level risk_level NOT NULL,
  score_components JSONB DEFAULT '{}',
  explanation TEXT,
  fraud_signals JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_risk_scores_app ON risk_scores(application_id);

-- ── Underwriting Decisions ──────────────────────────────────────────────
CREATE TABLE underwriting_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  decision decision_type NOT NULL,
  decision_reason TEXT,
  triggered_rules JSONB DEFAULT '[]',
  decided_by TEXT DEFAULT 'system',
  decided_by_user UUID REFERENCES profiles(id),
  decided_at TIMESTAMPTZ DEFAULT now()
);

-- ── Quotes ──────────────────────────────────────────────────────────────
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  quote_number TEXT UNIQUE,
  coverage_type coverage_type DEFAULT 'comprehensive',
  idv NUMERIC,
  base_premium NUMERIC,
  risk_loading NUMERIC DEFAULT 0,
  ncb_discount NUMERIC DEFAULT 0,
  addon_costs NUMERIC DEFAULT 0,
  final_premium NUMERIC,
  premium_breakdown JSONB DEFAULT '{}',
  selected_addons JSONB DEFAULT '[]',
  valid_until TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── Underwriting Rules ──────────────────────────────────────────────────
CREATE TABLE underwriting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  priority INTEGER NOT NULL,
  conditions JSONB NOT NULL,
  action JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default rules
INSERT INTO underwriting_rules (name, rule_type, priority, conditions, action) VALUES
  ('DUI Conviction - 2 Years', 'decline', 1, '{"dui_within_2_years": true}', '{"decision": "decline", "reason": "DUI conviction within the last 2 years"}'),
  ('Multiple At-Fault Accidents', 'decline', 2, '{"at_fault_accidents_gte": 3}', '{"decision": "decline", "reason": "3 or more at-fault accidents"}'),
  ('Vehicle Age Limit', 'decline', 3, '{"vehicle_age_gt": 20}', '{"decision": "decline", "reason": "Vehicle age exceeds 20 years"}'),
  ('Very High Risk Score', 'decline', 4, '{"score_gt": 85}', '{"decision": "decline", "reason": "Risk score exceeds threshold"}'),
  ('High Risk Score - Review', 'refer', 5, '{"score_between": [70, 85]}', '{"decision": "refer", "reason": "Risk score requires manual review"}'),
  ('Vehicle Modifications', 'refer', 6, '{"has_modifications": true}', '{"decision": "refer", "reason": "Vehicle modifications require review"}'),
  ('High Value Vehicle', 'refer', 7, '{"idv_gt": 2500000}', '{"decision": "refer", "reason": "High IDV requires underwriter review"}'),
  ('Recent Claim', 'refer', 8, '{"claim_within_12_months": true}', '{"decision": "refer", "reason": "Recent claim requires review"}'),
  ('Standard Approval', 'approve', 9, '{"score_lt": 70}', '{"decision": "approve", "reason": "Standard risk - approved"}');

-- ── Audit Logs ──────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  performed_by UUID REFERENCES profiles(id),
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_id);
CREATE INDEX idx_audit_performed_by ON audit_logs(performed_by);

-- ── Documents ───────────────────────────────────────────────────────────
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  document_type doc_type NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size_bytes BIGINT,
  is_verified BOOLEAN DEFAULT false,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Notifications ───────────────────────────────────────────────────────
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link_url TEXT,
  is_read BOOLEAN DEFAULT false,
  application_id UUID REFERENCES applications(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- ── Row Level Security ──────────────────────────────────────────────────
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE underwriting_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE underwriting_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read profiles in their org
CREATE POLICY "profiles_org_read" ON profiles FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Applications: agents see only their own; others see full org
CREATE POLICY "applications_agent_own" ON applications FOR SELECT
  USING (
    submitted_by = auth.uid()
    OR organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "applications_insert" ON applications FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "applications_update" ON applications FOR UPDATE
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Risk scores / decisions / quotes follow parent application access
CREATE POLICY "risk_scores_org" ON risk_scores FOR SELECT
  USING (application_id IN (SELECT id FROM applications));

CREATE POLICY "underwriting_decisions_org" ON underwriting_decisions FOR SELECT
  USING (application_id IN (SELECT id FROM applications));

CREATE POLICY "quotes_org" ON quotes FOR SELECT
  USING (application_id IN (SELECT id FROM applications));

-- Notifications: each user sees only their own
CREATE POLICY "notifications_own" ON notifications FOR ALL
  USING (recipient_id = auth.uid());

-- Audit logs: compliance officers and admins see all; others see own
CREATE POLICY "audit_org" ON audit_logs FOR SELECT
  USING (
    performed_by = auth.uid()
    OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin', 'compliance_officer')
  );

-- Underwriting rules: all authenticated users can read; only admins can modify
CREATE POLICY "rules_read" ON underwriting_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "rules_admin_write" ON underwriting_rules FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'super_admin'));

-- Documents: same org access
CREATE POLICY "documents_org" ON documents FOR SELECT
  USING (application_id IN (SELECT id FROM applications));
```

</details>

---

## Core Engines

### Risk Scoring Engine (`lib/risk-engine/scorer.ts`)

Takes an application's form data and returns a `RiskScore` object:

```
score = Σ (factor_score × weight) × 100
```

- Inputs: applicant age, driving experience (years), violations count, DUI flag, at-fault accidents, claims history, vehicle make/age/type, annual income
- Output: `{ overall_score, risk_level, score_components, explanation, fraud_signals }`

### Decision Engine (`lib/decision-engine/`)

Loads active rules from the database, sorts by priority, evaluates each rule's condition against the application and risk score. Returns on the **first matching rule**. If no rule matches, defaults to `refer`.

### Premium Calculator (`lib/premium-calculator/`)

```
base_premium    = IDV × base_rate(vehicle_age)
risk_loading    = base_premium × (risk_score / 100) × 0.5
ncb_discount    = base_premium × ncb_percentage
addon_total     = Σ selected_addon_costs
final_premium   = base_premium + risk_loading − ncb_discount + addon_total
```

---

## API Reference

### `POST /api/ai-assistant`

Stream a response from Claude about a specific application.

**Request body:**
```json
{
  "applicationId": "uuid",
  "messages": [{ "role": "user", "content": "Previous message" }],
  "userMessage": "What are the main risk factors for this application?"
}
```

**Response:** `text/plain` stream (token-by-token text chunks)

---

### `GET /api/quotes/:id/pdf`

Download a quote as a PDF file.

**Authorization (either one):**
- Authenticated session user belonging to the same organization
- `?token=<hmac>` signed query parameter (HMAC-SHA256 of `quoteId:email` with `QUOTE_SHARE_SECRET`)

**Response:** `application/pdf` — triggers file download

---

## Application Workflow (End-to-End)

```
Step 1  Agent logs in → navigates to Applications → New Application

Step 2  Fills 6-step form:
        [1] Applicant Info  →  [2] Vehicle Details  →  [3] Driving History
        →  [4] Coverage Selection  →  [5] Documents  →  [6] Review & Submit

Step 3  On submit → processApplication() server action runs:
        a) Risk Engine scores the application (0–100)
        b) Decision Engine evaluates rules → Approve | Refer | Decline
        c) Premium Calculator builds the quote
        d) Quote row created in database
        e) Audit log entry written

Step 4a If APPROVED:
        → Application status = 'approved'
        → Quote available immediately in the Quotes section
        → In-app notification created for the agent

Step 4b If REFERRED:
        → Application status = 'referred'
        → Appears in Underwriting Queue with SLA timer
        → Underwriter reviews application and makes a manual decision
        → Underwriter approves / declines with mandatory reason text
        → In-app notification created for the agent

Step 4c If DECLINED:
        → Application status = 'declined'
        → Reason stored in underwriting_decisions table

Step 5  Agent opens quote → adjusts coverage type / add-ons → accepts quote
        → Quote status changes to 'accepted'
        → Audit log updated
```

---

## Pages & Routes

<details>
<summary><strong>Auth Pages</strong></summary>

| Route | Description |
|---|---|
| `/` | Public marketing landing page |
| `/login` | Email + password login with show/hide toggle |
| `/register` | 3-step wizard — org details → account → success |
| `/forgot-password` | Send password reset email |

</details>

<details>
<summary><strong>Dashboard Pages (protected)</strong></summary>

| Route | Access | Description |
|---|---|---|
| `/dashboard` | All roles | KPI cards, status chart, recent applications, underwriter queue summary |
| `/applications` | All roles | Filterable/searchable applications table. Agents: own only. |
| `/applications/new` | Agent, Admin | 6-step application form with auto-save |
| `/applications/:id` | All roles | Tabbed detail — Overview, Risk Analysis, Documents, History. Decision Panel for underwriters. AI Assistant button present (partially implemented). |
| `/quotes` | All roles | All quotes with premium, coverage type, status, expiry |
| `/quotes/:id` | All roles | Interactive quote panel — coverage/addon selector, live premium, accept/decline |
| `/underwriting` | Underwriter, Admin, Super Admin | SLA-prioritized referral queue |
| `/rules` | Admin, Super Admin | List and toggle underwriting rules on/off |
| `/reports` | Underwriter, Admin, Super Admin | Analytics — STP rate, volumes, revenue, decision breakdown |
| `/audit` | Compliance Officer, Admin, Super Admin | Filterable audit trail with JSON diff |

</details>

---

## Scripts

```bash
# Start development server (with Turbopack)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run ESLint
pnpm lint

# TypeScript type-check (no emit)
pnpm type-check
```

---

## Key Design Decisions

- **Multi-tenant by design:** every table has `organization_id` — data is strictly scoped, no cross-org leakage
- **Server Actions over REST:** all mutations go through Next.js Server Actions; no hand-rolled API routes for data mutation
- **Service role key isolation:** `SUPABASE_SERVICE_ROLE_KEY` is only imported in `actions/` and `app/api/` — never referenced anywhere near client components
- **Audit everything:** every `processApplication`, `makeDecision`, `toggleRule`, `updateQuoteStatus` call writes to `audit_logs` before returning
- **AI assistant (partial):** the streaming plumbing via `ReadableStream` and the `/api/ai-assistant` route are built, but the feature requires a valid `ANTHROPIC_API_KEY` and additional testing before it is production-ready
- **Dark mode:** class-based via `next-themes`, persisted across sessions, toggle in the top header bar

---

<div align="center">
  <sub>Built with Next.js and Supabase</sub>
</div>

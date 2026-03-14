# RiskIQ — InsurTech Underwriting Platform

## Stack
Next.js 14 App Router, TypeScript strict, Tailwind CSS, shadcn/ui, Supabase (auth + db + storage + realtime), React Hook Form, Zod, Recharts, lucide-react, next-themes

## Design
- Font: DM Sans (body), Syne (headings) via next/font/google
- Colors: Primary #0F172A navy, Accent #0EA5E9 teal, BG #F8FAFC light / #0F172A dark
- Dark mode default, light mode toggle available
- Card radius 12px, button radius 8px
- Status colors: green=#22C55E approved, yellow=#EAB308 referred, red=#EF4444 declined, blue=#3B82F6 processing, gray=#6B7280 draft

## Rules
- Never use select * — always name columns
- Service role key only in /actions/ and /app/api/ — never in components  
- Every server action: verify session first, validate with Zod, execute, log to audit_logs, return {success, data?, error?}
- Every page needs page.tsx + loading.tsx + error.tsx
- Default to Server Components — use client only for interactivity
- All mutations must log to audit_logs table
- Supabase MCP is connected — use it to create/modify database directly

## Modules to build (in order)
1. Database schema via Supabase MCP
2. Auth (login, register)
3. Layout (sidebar, header)
4. Application form (6 steps)
5. Risk + decision engine
6. Dashboard + all pages
7. AI features
```

---

## MODULE 1 — Database (paste this in Codex)
```
Use the Supabase MCP to create the complete database schema for RiskIQ directly in my Supabase project. Do not generate SQL files — execute everything live via MCP.

Create these ENUM types first:
- user_role: super_admin, admin, underwriter, agent, compliance_officer
- app_status: draft, submitted, processing, approved, declined, referred, cancelled
- product_type: auto, home, commercial
- risk_level: very_low, low, medium, high, very_high
- coverage_type: third_party, comprehensive, third_party_fire_theft
- decision_type: approved, declined, referred
- doc_type: proposal_form, id_proof, vehicle_inspection, claim_history, other
- notification_type: new_application, decision_made, quote_ready, exception_flagged

Then create these tables in order (each with id UUID primary key, created_at, updated_at):

TABLE 1 — organizations
id, name text, license_number text, state text, settings jsonb default '{}'

TABLE 2 — profiles (extends auth.users)
id UUID references auth.users, full_name text, email text, phone text,
role user_role default 'agent', organization_id UUID references organizations,
avatar_url text, is_active boolean default true

TABLE 3 — applications
id, application_number text unique, status app_status default 'draft',
product_type product_type default 'auto',
applicant_name text, applicant_email text, applicant_phone text, applicant_dob date,
applicant_address jsonb, vehicle_details jsonb, driving_history jsonb,
coverage_selection jsonb, raw_form_data jsonb,
organization_id UUID references organizations,
submitted_by UUID references profiles, assigned_to UUID references profiles,
submitted_at timestamptz, processed_at timestamptz

TABLE 4 — risk_scores
id, application_id UUID references applications unique,
overall_score integer check(0-100), risk_level risk_level,
score_components jsonb, explanation text, scored_at timestamptz default now()

TABLE 5 — underwriting_decisions
id, application_id UUID references applications unique,
decision decision_type, decision_reason text, triggered_rules jsonb,
decided_by text check in ('system','underwriter'),
decided_by_user UUID references profiles,
decided_at timestamptz default now(), override_reason text

TABLE 6 — quotes
id, application_id UUID references applications,
quote_number text unique, coverage_type coverage_type,
idv numeric, base_premium numeric, risk_loading numeric,
ncb_discount numeric, addon_costs numeric, final_premium numeric,
premium_breakdown jsonb, addons jsonb, valid_until timestamptz,
status text default 'draft', pdf_url text

TABLE 7 — underwriting_rules
id, name text, description text,
rule_type text check in ('decline','refer','approve','pricing_modifier'),
priority integer, conditions jsonb, action jsonb,
product_type product_type default 'auto',
is_active boolean default true,
created_by UUID references profiles

TABLE 8 — audit_logs
id, action_type text, entity_type text, entity_id UUID,
performed_by UUID references profiles,
old_value jsonb, new_value jsonb, metadata jsonb,
created_at timestamptz default now()

TABLE 9 — documents
id, application_id UUID references applications,
document_type doc_type, file_name text, file_url text,
file_size_bytes integer, is_verified boolean default false,
uploaded_by UUID references profiles

TABLE 10 — notifications
id, recipient_id UUID references profiles,
type notification_type, title text, message text,
link_url text, is_read boolean default false,
application_id UUID references applications

After creating all tables:

1. Create indexes:
- applications: on status, organization_id, submitted_by, submitted_at
- audit_logs: on entity_id, performed_by, created_at
- notifications: on recipient_id, is_read
- risk_scores: on application_id

2. Enable Row Level Security on ALL tables

3. Create RLS policies:
For each table with organization_id: users can only access rows where organization_id matches their profile's organization_id
For profiles: users can only see profiles in their organization
For audit_logs: admins and compliance_officers see all in their org, others see only logs where performed_by = auth.uid()

4. Create a Postgres function generate_application_number() that returns APP-{YEAR}-{5 digit sequence} format

5. Create a trigger that calls generate_application_number() on insert to applications when application_number is null

6. Insert default underwriting rules into underwriting_rules table (no created_by needed for defaults):
- RULE_001 priority 1 type decline: DUI in last 2 years
- RULE_002 priority 2 type decline: 3+ at-fault accidents in 3 years  
- RULE_003 priority 3 type decline: vehicle older than 20 years
- RULE_004 priority 4 type decline: risk score over 85
- RULE_010 priority 100 type refer: risk score between 70 and 85
- RULE_011 priority 101 type refer: vehicle has modifications
- RULE_012 priority 102 type refer: IDV over 2500000
- RULE_013 priority 103 type refer: any claim in last 6 months
- RULE_020 priority 200 type approve: score under 70 clean record

7. Create Supabase storage bucket called "documents" with public: false

After everything is done, confirm:
- How many tables were created
- How many indexes
- How many RLS policies
- That the storage bucket exists
```

---

## MODULE 2 — Auth (paste after Module 1 is confirmed done)
```
Build the complete authentication system for RiskIQ. The database is already set up via Supabase MCP.

Create /lib/supabase/client.ts — browser client using createBrowserClient from @supabase/ssr
Create /lib/supabase/server.ts — server client using createServerClient from @supabase/ssr with cookies()
Create /lib/supabase/admin.ts — service role client, add comment: NEVER import in components or client code

Create /middleware.ts:
- Protect all /dashboard/* routes — redirect to /login if no session
- Refresh Supabase session on every request
- Allow /login, /register, /forgot-password without session

Create /app/(auth)/login/page.tsx:
- Full page split layout. Left panel: dark navy background (#0F172A), RiskIQ logo with Shield icon from lucide, tagline "Underwriting at the speed of intelligence", and 3 feature bullets with check icons (Instant risk scoring, Auto decisions in seconds, Full audit trail)
- Right panel: white card centered, "Welcome back" heading in Syne font, email + password fields using shadcn Input, show/hide password toggle, "Remember me" checkbox, Sign In button (teal #0EA5E9 background, full width), "Forgot password?" link below, divider, "New organization? Register here" link
- React Hook Form + Zod: email must be valid, password min 6 chars
- On submit: call Supabase signInWithPassword, redirect to /dashboard on success, show inline error message on failure (not a toast — show it in a red alert box above the form)
- Loading state on button during submission

Create /app/(auth)/register/page.tsx:
- 3 step wizard with step indicator at top (Step 1 of 3)
- Step 1 — Organization: organization name, license number, state (shadcn Select with all Indian states), phone number
- Step 2 — Your Account: full name, email, password with strength meter (weak/medium/strong shown as colored bar), confirm password
- Step 3 — Done: success animation (simple CSS checkmark), "Your account is ready" message, "Go to Dashboard" button
- On final submit: create organization row first, then call Supabase signUp with metadata {full_name, organization_id, role: 'admin'}, then create profile row using service role via server action
- React Hook Form + Zod validation on each step, validate before moving to next step

Create /app/(auth)/forgot-password/page.tsx:
- Simple centered card, email input, Submit button
- Calls Supabase resetPasswordForEmail with redirect URL
- Shows success message after submit

Create /actions/auth.ts server actions:
- registerUser(data) — creates org, creates profile, returns {success, error?}
- All errors returned as typed objects, never thrown

After building, run pnpm run type-check. Report all files created and any errors found.
```

---

## MODULE 3 — Layout & Shell (paste after Module 2)
```
Build the complete dashboard layout and shell for RiskIQ. Auth is already working.

Create /app/(dashboard)/layout.tsx:
This is a server component that:
- Gets the current user session and their profile (role, name, organization) from Supabase
- Renders the sidebar + header shell around {children}
- Redirects to /login if no session

Create /components/layout/Sidebar.tsx (client component for active state):
- Fixed left sidebar, 240px wide, background #0F172A
- Top: RiskIQ text logo with Shield icon (lucide), teal colored, with a subtle border-bottom
- Navigation items with icons — show/hide based on role from props:
  * Dashboard — LayoutDashboard icon — all roles
  * Applications — FileText icon — all roles — show a yellow badge with count of pending applications
  * Underwriting — ShieldCheck icon — underwriter + admin only
  * Quotes — Receipt icon — all roles
  * Rules Engine — SlidersHorizontal icon — admin only
  * Reports — BarChart3 icon — admin + underwriter
  * Audit Trail — ClipboardList icon — compliance_officer + admin
- Active item: teal left border + teal text + light teal background
- Inactive item: gray text, hover shows slightly lighter background
- Bottom section: user avatar (circle with initials if no photo), user full name, role badge (colored pill — green for admin, blue for agent, purple for underwriter), logout button with LogOut icon
- Logout calls Supabase signOut then redirects to /login

Create /components/layout/Header.tsx (client component):
- Top bar, full width, white background with bottom border
- Left: breadcrumb showing current page name (read from usePathname)
- Right: notification bell (Bell icon from lucide) with red badge showing unread count — fetch from notifications table where recipient_id = current user and is_read = false
- Clicking bell opens a Popover (shadcn) showing last 5 notifications as a list — each has an icon by type, title, message preview, time ago — clicking marks it read and navigates to link_url
- Dark/light mode toggle button (Moon/Sun icon)

Create placeholder pages so the shell works without errors:
/app/(dashboard)/dashboard/page.tsx — just "Dashboard coming soon" text for now
/app/(dashboard)/applications/page.tsx — just "Applications coming soon"
/app/(dashboard)/underwriting/page.tsx — just "Underwriting coming soon"
/app/(dashboard)/quotes/page.tsx — just "Quotes coming soon"
/app/(dashboard)/rules/page.tsx — just "Rules coming soon"
/app/(dashboard)/reports/page.tsx — just "Reports coming soon"
/app/(dashboard)/audit/page.tsx — just "Audit coming soon"

Each placeholder page + loading.tsx (skeleton) + error.tsx (error boundary with retry button)

Run pnpm dev and confirm the sidebar renders, navigation works, and logout button works. Report all files created and any TypeScript errors.
```

---

## MODULE 4 — Application Form (paste after Module 3)
```
Build the 6-step auto insurance application form for RiskIQ.

Create /lib/validators/application.ts with Zod schemas for all 6 steps:
- Step1Schema: full_name, email, phone (regex for Indian mobile), dob, pan (masked), address (line1, line2, city, state, pincode), occupation, income_range
- Step2Schema: vehicle_type, make, model, year, registration_number (regex MH01AB1234 format), vin, fuel_type, usage_type, parking_type, has_modifications boolean
- Step3Schema: years_experience, license_number, license_type, accidents array (date, description, at_fault), violations array (date, type, fine), had_previous_insurance, previous_insurer?, ncb_years?
- Step4Schema: coverage_type enum, selected_addons array, idv number min 50000 max 3000000
- Step5Schema: uploaded_documents array (file references)
- Step6Schema: terms_accepted must be true

Create /components/forms/ApplicationForm.tsx as a client component:

PROGRESS BAR: Steps 1-6 shown as numbered circles connected by line. Completed = filled teal, current = teal border, upcoming = gray. Step label below each circle.

STEP 1 — Applicant Info:
Two column grid (single column mobile). Fields: Full Name, Email, Phone, Date of Birth (date picker — show "Age: 32 years" next to it dynamically), PAN Number (show only last 4 chars after user leaves the field), Address Line 1, Address Line 2, City, State (Select with all Indian states), Pincode, Occupation (Select: Salaried, Self-employed, Business Owner, Student, Retired, Other), Annual Income (Select: Under ₹3L, ₹3-5L, ₹5-10L, ₹10-25L, Above ₹25L)

STEP 2 — Vehicle Info:
Vehicle Type: 4 icon cards to click (Bike, Car, SUV, Commercial — use lucide icons). Make: Select dropdown. Model: text input. Year: Select 2000-2026. Registration Number: input with format hint. Fuel Type: radio pill buttons (Petrol/Diesel/CNG/Electric/Hybrid). Usage: radio (Personal/Commercial). Parking: radio (Garage/Open/Street). Modifications: yes/no toggle — if yes show a yellow warning callout box: "Vehicles with modifications will be reviewed by an underwriter before approval."

STEP 3 — Driving History:
Years of experience: number input. License number + type Select. 
Accidents section: "Add Accident" button, each entry is a card with: date picker, description textarea, at-fault checkbox, remove button. Max 5.
Violations section: "Add Violation" button, each entry: date picker, type Select (Speeding/Signal Jump/Wrong Lane/DUI/Reckless/Other), remove button. Max 5.
Previous insurance: yes/no. If yes: insurer name input, years insured number, NCB years Select (0-5 with discount % shown: 0yr=0%, 1yr=20%, 2yr=25%, 3yr=35%, 4yr=45%, 5yr=50%).

STEP 4 — Coverage:
Three large cards to click and select one:
- Third Party Only: icon, "Legally required minimum", lowest price estimate
- Third Party + Fire & Theft: icon, "Popular choice" badge in teal
- Comprehensive: icon, "Recommended" badge in green, highest price
After selecting, show add-ons as checkbox cards (icon + name + price per year):
Zero Depreciation ₹2,400 | Roadside Assistance ₹800 | Engine Protection ₹1,200 | Return to Invoice ₹1,800 | Personal Accident ₹600
IDV Slider: label "Vehicle Insured Value", ₹50,000 to ₹30,00,000, show formatted value above slider. Show premium estimate updating live as user changes IDV and addons.

STEP 5 — Documents:
Three upload zones, each is a dashed border card with upload icon:
- ID Proof (Required): Aadhaar / PAN / Passport
- Vehicle RC (Required)  
- Previous Policy (Optional)
Each zone: drag and drop or click to browse. After upload: show filename, size, green checkmark, remove button. Upload to Supabase storage bucket "documents" under path: applications/temp/{random-id}/{type}/filename. File validation: PDF/JPG/PNG only, max 5MB, checked client side before upload.

STEP 6 — Review:
Show all data in 5 collapsible accordion sections (shadcn Accordion), one per step. Each has an Edit button that jumps back to that step number. Show premium estimate card: coverage type, addons list, final estimated amount in large text. Terms checkbox (required). Submit button.

FORM BEHAVIOR:
- Validate current step with Zod on clicking Next — show field errors inline
- Auto-save to Supabase applications table as status='draft' every 30 seconds using debounce
- On page load: check if a draft exists for current user — if yes show a banner "Resume your draft application?" with Resume and Start Fresh buttons
- Between steps: slide animation (framer-motion or CSS transition)
- Submit calls server action processApplication(formData) from /actions/process-application.ts (create the file with a placeholder function for now — we wire logic in Module 5)
- After submit: redirect to /applications/{id}?status=processing with a processing animation

Create /app/(dashboard)/applications/new/page.tsx that renders ApplicationForm inside the dashboard layout.

Run pnpm run type-check. Report all files created.
```

---

## MODULE 5 — Risk Engine + Server Actions (paste after Module 4)
```
Build the risk scoring engine, decision engine, premium calculator, and all server actions for RiskIQ. This is pure business logic — no UI changes needed.

Create /lib/risk-engine/scorer.ts — pure TypeScript functions only, no imports from React or Supabase:

Export calculateRiskScore(input: ApplicationInput): RiskScoreResult

Score = weighted average of 6 components (each 0-100 integer, higher = more risk):

1. ageFactor weight 15%: under22→85, 22-25→70, 26-35→25, 36-55→15, 56-65→30, over65→55
2. experienceFactor weight 20%: under1yr→90, 1-2yr→70, 3-5yr→40, 6-10yr→20, over10yr→10
3. violationsFactor weight 25%: none→5, 1minor→30, 2minor→55, 1DUI→80, DUI_last2yrs→95, add 10 per extra violation
4. claimsFactor weight 20%: none→5, 1claim→30, 2claims→55, 3plus→80, add 15 per at-fault claim
5. vehicleFactor weight 10%: age0-3→15, 4-7→30, 8-12→55, over12→75, modifications add 30, electric subtract 10, sports add 20
6. incomeFactor weight 10%: above25L→5, 10-25L→15, 5-10L→30, 3-5L→50, under3L→70

overallScore = Math.round(sum of (componentScore × weight))
riskLevel: 0-20→very_low, 21-40→low, 41-60→medium, 61-75→high, 76-100→very_high

Return: { overallScore, riskLevel, components: {name, score, weight, contribution}[], explanation: string }
explanation is a single plain English sentence summarizing the top 2 risk factors.

Create /lib/decision-engine/rules.ts:
Export DEFAULT_RULES array of UnderwritingRule objects. Include all 9 rules from Module 1 seed data. Each rule has: id, name, description, type, priority, conditions array, conditionOperator AND/OR, isActive.

Create /lib/decision-engine/processor.ts:
Export processDecision(score: RiskScoreResult, appData: ApplicationInput, rules: UnderwritingRule[]): DecisionResult
- Filter only active rules, sort by priority ascending
- For each rule evaluate all conditions against score + appData
- Return first matching rule's decision
- Return { decision, triggeredRuleIds, primaryReason, canOverride }

Create /lib/premium-calculator/calculator.ts:
Export calculatePremium(params: PremiumParams): PremiumBreakdown
Base rates by vehicle age: 0-1yr→2.5%, 2-3yr→2.8%, 4-5yr→3.2%, 6-7yr→3.8%, 8-10yr→4.5%, over10yr→5.2%
base_premium = IDV × base_rate
risk_loading = base_premium × (overallScore / 100) × 0.5
NCB discounts: 0→0%, 1→20%, 2→25%, 3→35%, 4→45%, 5→50%
ncb_discount = base_premium × ncb_rate
Addon costs: zero_dep→2400, roadside→800, engine_protection→1200, return_invoice→1800, personal_accident→600
final_premium = base_premium + risk_loading - ncb_discount + sum(selected addons)
Return all line items as a breakdown object with each value as a number rounded to 2 decimal places.

Create /actions/process-application.ts server action:
Export processApplication(applicationId: string): Promise<ActionResult<ProcessResult>>

Steps in order:
1. Verify session — return unauthorized if no session
2. Fetch application from Supabase by id — verify it belongs to user's org
3. Extract ApplicationInput from the stored raw_form_data
4. Call calculateRiskScore(input) 
5. Call processDecision(score, input, DEFAULT_RULES)
6. If decision is approved or referred: call calculatePremium(params)
7. Update application status in Supabase
8. Insert row into risk_scores table
9. Insert row into underwriting_decisions table
10. If not declined: insert row into quotes table with status='draft'
11. Insert notification for the agent: type based on decision, title and message describing the outcome
12. Insert audit_log entry: action_type='APPLICATION_PROCESSED', entity_type='applications', entity_id=applicationId, new_value={decision, score}
13. Return { success: true, data: { applicationId, decision, overallScore, riskLevel, quote? } }

All Supabase writes use the admin client. Catch all errors and return { success: false, error: 'message' } — never throw.

Create /types/index.ts (update or create) with all interfaces: ApplicationInput, RiskScoreResult, ScoreComponent, DecisionResult, PremiumBreakdown, PremiumParams, ProcessResult, ActionResult<T>, UnderwritingRule, RuleCondition.

Run pnpm run type-check — must pass with 0 errors. Report all files created.
```

---

## MODULE 6 — All Pages with Real Data (paste after Module 5)
```
Build all dashboard pages wired to real Supabase data for RiskIQ.

PAGE: /app/(dashboard)/dashboard/page.tsx
Server component. Fetch from Supabase:
- Count of applications by status for current org
- Today's application count
- This week's approved count + total premium sum from quotes
- Last 5 applications with applicant_name, application_number, status, overall_score from risk_scores

Render:
- 4 stat cards in a row: Today's Applications, Pending Review (referred + submitted count), Approved This Week, Avg Risk Score
- Each card: metric label, large number, small colored trend text
- Applications by status: horizontal bar chart using Recharts BarChart. X axis = count, Y axis = status labels. Colors match status color system from AGENTS.md
- Recent applications table: App#, Applicant, Risk Score badge (colored by level), Status badge, Time ago. Clicking a row navigates to /applications/{id}
- For underwriter role only: add a "Review Queue" card below showing referred applications sorted by submitted_at ascending with time elapsed shown as "2h ago" in red if over 4 hours

PAGE: /app/(dashboard)/applications/page.tsx
Server component with client-side filters.
Fetch all applications for org (agents see only their own, underwriters/admins see all — check role from session).
Join with risk_scores to get overall_score.

Render:
- Top bar: Search input (searches applicant_name and application_number), Status filter Select, Date range Select (Today/This Week/This Month), New Application button top right
- Table with columns: Application #, Applicant Name, Vehicle (from vehicle_details jsonb: make + model), Risk Score (colored badge: green very_low/low, yellow medium, orange high, red very_high), Status (colored badge), Submitted date formatted as "10 Mar 2026", Action (View button)
- Clicking anywhere on row navigates to /applications/{id}
- Empty state: centered, icon, "No applications found" text, clear filters button
- Loading state: skeleton rows

PAGE: /app/(dashboard)/applications/[id]/page.tsx
Server component, fetch application + risk_score + decision + quote + documents + audit_logs for this id.

Render a page with 4 tabs using shadcn Tabs:

TAB 1 — Overview:
- Status banner full width at top: color by status, show status label + decision reason text
- Two cards side by side: Applicant Info (name, email, phone, DOB, address, PAN masked) and Vehicle Info (make, model, year, reg number, fuel type, modifications badge if true)
- Driving History section: years experience, license, accidents as a list, violations as a list, NCB years
- If approved: Quote Summary card showing coverage type, final premium in large text, valid until date, Download PDF button (placeholder for now), Accept Quote button

TAB 2 — Risk Analysis:
- Large score circle: SVG circle with stroke-dasharray to show score as a ring. Color of ring = risk level color. Score number in center (large, bold), risk level label below
- Score breakdown: 6 rows, each with factor name, weight badge, score bar (colored progress bar), contribution text
- Triggered rules: list of rule cards that fired, each with icon (X = decline, warning triangle = refer) and rule description
- Score explanation: the explanation string from risk_scores table shown in a subtle info box

TAB 3 — Documents:
- Grid of document cards (2 columns). Each card: document type icon, filename, file size, upload date, Download button
- Upload Document button — opens a dialog with file dropzone, document type select, upload button. Uploads to Supabase storage and creates documents row.

TAB 4 — History:
- Vertical timeline. Each entry: colored dot, action description, performed by name, timestamp formatted as "10 Mar 2026, 2:34 PM"
- Fetch from audit_logs where entity_id = application id, ordered by created_at desc

For underwriters only — if status is 'referred', show a Decision Panel below the tabs (not inside tabs):
- Yellow banner "This application requires your review"
- Risk score summary (score, level, top triggered rules)
- Two buttons: Approve (green) and Decline (red)
- Clicking either opens a Dialog: reason select (dropdown of standard reasons) + optional notes textarea + Confirm button
- Confirm calls server action makeUnderwritingDecision(applicationId, decision, reason, notes)

Create that server action in /actions/underwriting.ts following the same pattern as process-application.ts. It updates underwriting_decisions, updates application status, generates/updates quote if approved, creates notification, logs to audit.

PAGE: /app/(dashboard)/quotes/page.tsx
List of all quotes for org. Table: Quote #, Application #, Applicant, Coverage Type, Final Premium formatted as ₹18,400/yr, Status badge, Valid Until, View button.

Run pnpm run type-check and pnpm run build. Report all files created and fix any errors before reporting done.
```

---

## MODULE 7 — AI Layer (paste last)
```
Add AI features to RiskIQ using the Anthropic API. Key is in .env.local as ANTHROPIC_API_KEY.

All Anthropic API calls go in server actions or /app/api/ routes only — never client side.

FEATURE 1 — AI Score Explanation
Update /actions/process-application.ts after calculateRiskScore():
Call Anthropic API with this system prompt:
"You are an insurance underwriting analyst. Given a risk score breakdown, write exactly 3 sentences in plain English explaining why this applicant received this score. Be specific about which factors contributed most. Do not use jargon. Do not recommend a decision."
User message: the score components JSON
Store the 3-sentence response in the explanation column of risk_scores table.
Show it on the Risk Analysis tab in an info callout box.

FEATURE 2 — Underwriting AI Assistant
Create /app/api/ai-assistant/route.ts as a POST route:
- Accepts { applicationId, messages: ChatMessage[], userMessage: string }
- Fetches full application data from Supabase using admin client
- Builds system prompt: "You are an AI underwriting assistant for RiskIQ. You have access to the following application data: {application JSON}. Help the underwriter analyze this application. Be concise and factual. Never make the final decision for the underwriter — only provide analysis and insights."
- Appends userMessage to messages array and sends to Anthropic API with streaming
- Returns streaming text response

Create /components/ai/UnderwritingAssistant.tsx client component:
- Floating button in bottom-right of /applications/[id] page — blue circle with MessageSquare icon
- Clicking opens a slide-over panel from the right, 380px wide
- Panel header: "AI Assistant" with X close button
- 5 suggestion chips at top: "Summarize key risks", "Compare to similar profiles", "What factors can improve this score?", "Are there any red flags?", "Explain the triggered rules"
- Chat messages area: user messages right-aligned teal bubble, AI messages left-aligned gray bubble
- Input at bottom with Send button
- Clicking a suggestion chip sends it as the message
- Calls /api/ai-assistant with applicationId and message history
- Show typing indicator (3 animated dots) while waiting for response
- Add this component to /applications/[id]/page.tsx

FEATURE 3 — Fraud Signal Detection  
Create /lib/ai/fraud-detector.ts server function:
detectFraudSignals(applicationId: string, orgId: string): Promise<FraudAnalysis>
- Query Supabase: count applications with same phone in last 30 days, same registration number ever, same address in last 7 days
- Call Anthropic API with these counts + application data
- Ask: "Based on these patterns, rate the fraud probability 0-100 and list specific concerns. Return JSON: { probability: number, flags: string[], recommendation: string }"
- Store result in risk_scores table as fraud_signals jsonb column (add this column via Supabase MCP)
- If probability > 60 show a red "Fraud Risk Alert" banner on the application detail page

Call detectFraudSignals inside processApplication after scoring.

Run pnpm run type-check and pnpm run build — must both pass. Report all files created.
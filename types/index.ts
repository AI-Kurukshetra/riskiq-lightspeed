export type UserRole = "super_admin" | "admin" | "underwriter" | "agent" | "compliance_officer";
export type AppStatus = "draft" | "submitted" | "processing" | "approved" | "declined" | "referred" | "cancelled";
export type ProductType = "auto" | "home" | "commercial";
export type RiskLevel = "very_low" | "low" | "medium" | "high" | "very_high";
export type CoverageType = "third_party" | "comprehensive" | "third_party_fire_theft";
export type DecisionType = "approved" | "declined" | "referred";
export type DocType = "proposal_form" | "id_proof" | "vehicle_inspection" | "claim_history" | "other";
export type NotificationType = "new_application" | "decision_made" | "quote_ready" | "exception_flagged";
export type RuleType = "decline" | "refer" | "approve" | "pricing_modifier";

export interface Organization {
  id: string;
  name: string;
  license_number: string | null;
  state: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  organization_id: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  application_number: string | null;
  status: AppStatus;
  product_type: ProductType;
  applicant_name: string | null;
  applicant_email: string | null;
  applicant_phone: string | null;
  applicant_dob: string | null;
  applicant_address: Record<string, unknown>;
  vehicle_details: Record<string, unknown>;
  driving_history: Record<string, unknown>;
  coverage_selection: Record<string, unknown>;
  raw_form_data: Record<string, unknown>;
  organization_id: string;
  submitted_by: string | null;
  assigned_to: string | null;
  submitted_at: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskScore {
  id: string;
  application_id: string;
  overall_score: number;
  risk_level: RiskLevel;
  score_components: Record<string, unknown>;
  explanation: string | null;
  fraud_signals: Record<string, unknown>;
  scored_at: string;
}

export interface UnderwritingDecision {
  id: string;
  application_id: string;
  decision: DecisionType;
  decision_reason: string | null;
  triggered_rules: Array<Record<string, unknown>>;
  decided_by: "system" | "underwriter";
  decided_by_user: string | null;
  decided_at: string;
  override_reason: string | null;
}

export interface Quote {
  id: string;
  application_id: string;
  quote_number: string | null;
  coverage_type: CoverageType;
  idv: number;
  base_premium: number;
  risk_loading: number;
  ncb_discount: number;
  addon_costs: number;
  final_premium: number;
  premium_breakdown: Record<string, unknown>;
  selected_addons: string[];
  valid_until: string | null;
  status: string;
  pdf_url: string | null;
  created_at: string;
}

export interface UnderwritingRule {
  id: string;
  name: string;
  description: string | null;
  rule_type: RuleType;
  priority: number;
  conditions: Array<Record<string, unknown>>;
  action: Record<string, unknown>;
  product_type: ProductType;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  application_id: string;
  document_type: DocType;
  file_name: string;
  file_url: string;
  file_size_bytes: number | null;
  is_verified: boolean;
  uploaded_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  performed_by: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link_url: string | null;
  is_read: boolean;
  application_id: string | null;
  created_at: string;
}

export interface ApplicationInput {
  age: number;
  drivingExperienceYears: number;
  minorViolations: number;
  duiCount: number;
  duiInLast2Years: boolean;
  claimsCount: number;
  atFaultClaimsCount: number;
  vehicleAgeYears: number;
  hasModifications: boolean;
  isEv: boolean;
  isSportsCar: boolean;
  annualIncome: number;
  idv: number;
  ncbYears: number;
  selectedAddons: string[];
}

export interface ScoreComponent {
  name: string;
  score: number;
  weight: number;
  contribution: number;
}

export interface RiskScoreResult {
  overallScore: number;
  riskLevel: RiskLevel;
  scoreComponents: ScoreComponent[];
}

export interface DecisionResult {
  decision: DecisionType;
  triggeredRuleIds: string[];
  primaryReason: string;
}

export interface PremiumBreakdown {
  basePremium: number;
  riskLoading: number;
  ncbDiscount: number;
  zeroDep: number;
  roadside: number;
  engine: number;
  returnInvoice: number;
  personalAccident: number;
  addonCosts: number;
  finalPremium: number;
}

export type ActionResult<T> = { success: true; data: T } | { success: false; error: string };

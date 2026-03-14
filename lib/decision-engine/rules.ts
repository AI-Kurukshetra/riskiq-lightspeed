import type { ApplicationInput, DecisionType } from "@/types";

export type RuleOperator = "equals" | "gt" | "gte" | "lt" | "lte" | "between";

export interface RuleCondition {
  field: keyof ApplicationInput | "overallScore";
  operator: RuleOperator;
  value: boolean | number | [number, number];
}

export interface DecisionRule {
  id: string;
  name: string;
  description: string;
  type: DecisionType;
  priority: number;
  conditions: RuleCondition[];
  conditionOperator: "AND" | "OR";
  isActive: boolean;
}

// RULE_001: Decline when DUI is reported in the last 24 months.
const RULE_001: DecisionRule = {
  id: "RULE_001",
  name: "DUI last 24 months",
  description: "DUI conviction in last 24 months",
  type: "declined",
  priority: 1,
  conditions: [{ field: "duiInLast2Years", operator: "equals", value: true }],
  conditionOperator: "AND",
  isActive: true,
};

// RULE_002: Decline when at-fault accidents are 3 or more in 3 years.
const RULE_002: DecisionRule = {
  id: "RULE_002",
  name: "High at-fault accidents",
  description: "3 or more at-fault accidents in 3 years",
  type: "declined",
  priority: 2,
  conditions: [{ field: "atFaultClaimsCount", operator: "gte", value: 3 }],
  conditionOperator: "AND",
  isActive: true,
};

// RULE_003: Decline when vehicle age exceeds 20 years.
const RULE_003: DecisionRule = {
  id: "RULE_003",
  name: "Vehicle age > 20",
  description: "Vehicle older than 20 years",
  type: "declined",
  priority: 3,
  conditions: [{ field: "vehicleAgeYears", operator: "gt", value: 20 }],
  conditionOperator: "AND",
  isActive: true,
};

// RULE_004: Decline when overall score is above 85.
const RULE_004: DecisionRule = {
  id: "RULE_004",
  name: "Score above max",
  description: "Risk score above maximum threshold",
  type: "declined",
  priority: 4,
  conditions: [{ field: "overallScore", operator: "gt", value: 85 }],
  conditionOperator: "AND",
  isActive: true,
};

// RULE_010: Refer when score is between 70 and 85.
const RULE_010: DecisionRule = {
  id: "RULE_010",
  name: "Review range score",
  description: "Risk score in review range",
  type: "referred",
  priority: 100,
  conditions: [{ field: "overallScore", operator: "between", value: [70, 85] }],
  conditionOperator: "AND",
  isActive: true,
};

// RULE_011: Refer when vehicle has modifications.
const RULE_011: DecisionRule = {
  id: "RULE_011",
  name: "Vehicle modifications",
  description: "Vehicle has modifications",
  type: "referred",
  priority: 101,
  conditions: [{ field: "hasModifications", operator: "equals", value: true }],
  conditionOperator: "AND",
  isActive: true,
};

// RULE_012: Refer when IDV exceeds 25 lakh.
const RULE_012: DecisionRule = {
  id: "RULE_012",
  name: "High IDV",
  description: "High value vehicle IDV over 25 lakh",
  type: "referred",
  priority: 102,
  conditions: [{ field: "idv", operator: "gt", value: 2500000 }],
  conditionOperator: "AND",
  isActive: true,
};

// RULE_013: Refer when there is any recent claim flag.
const RULE_013: DecisionRule = {
  id: "RULE_013",
  name: "Recent claim",
  description: "Recent claim in last 6 months",
  type: "referred",
  priority: 103,
  conditions: [{ field: "claimsCount", operator: "gt", value: 0 }],
  conditionOperator: "AND",
  isActive: true,
};

// RULE_020: Approve when score is under 70.
const RULE_020: DecisionRule = {
  id: "RULE_020",
  name: "Standard approval",
  description: "Standard approval — score under 70",
  type: "approved",
  priority: 200,
  conditions: [{ field: "overallScore", operator: "lt", value: 70 }],
  conditionOperator: "AND",
  isActive: true,
};

export const DEFAULT_RULES: DecisionRule[] = [
  RULE_001,
  RULE_002,
  RULE_003,
  RULE_004,
  RULE_010,
  RULE_011,
  RULE_012,
  RULE_013,
  RULE_020,
];

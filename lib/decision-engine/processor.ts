import type { ApplicationInput, DecisionResult, RiskScoreResult } from "@/types";
import type { DecisionRule, RuleCondition } from "@/lib/decision-engine/rules";

const getFieldValue = (input: ApplicationInput, score: RiskScoreResult, field: RuleCondition["field"]): boolean | number => {
  if (field === "overallScore") {
    return score.overallScore;
  }

  const value = input[field];
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  return 0;
};

const evaluateCondition = (value: boolean | number, condition: RuleCondition): boolean => {
  if (condition.operator === "equals") {
    return value === condition.value;
  }

  if (typeof value !== "number") {
    return false;
  }

  if (condition.operator === "gt" && typeof condition.value === "number") return value > condition.value;
  if (condition.operator === "gte" && typeof condition.value === "number") return value >= condition.value;
  if (condition.operator === "lt" && typeof condition.value === "number") return value < condition.value;
  if (condition.operator === "lte" && typeof condition.value === "number") return value <= condition.value;

  if (condition.operator === "between" && Array.isArray(condition.value) && condition.value.length === 2) {
    return value >= condition.value[0] && value <= condition.value[1];
  }

  return false;
};

export const processDecision = (
  score: RiskScoreResult,
  appData: ApplicationInput,
  rules: DecisionRule[],
): DecisionResult => {
  const sortedRules = [...rules].filter((rule) => rule.isActive).sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    const evaluations = rule.conditions.map((condition) =>
      evaluateCondition(getFieldValue(appData, score, condition.field), condition),
    );

    const matched = rule.conditionOperator === "OR" ? evaluations.some(Boolean) : evaluations.every(Boolean);

    if (matched) {
      return {
        decision: rule.type,
        triggeredRuleIds: [rule.id],
        primaryReason: rule.description,
      };
    }
  }

  return {
    decision: "referred",
    triggeredRuleIds: [],
    primaryReason: "No rule matched. Manual review required.",
  };
};

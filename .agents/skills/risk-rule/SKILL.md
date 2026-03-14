---
name: risk-rule
description: Use when adding, editing, or explaining underwriting rules, risk scoring logic, premium calculation, or any decision engine changes.
---

## Rule structure (must follow exactly)
```typescript
export interface UnderwritingRule {
  id: string                    // format: "RULE_001"
  name: string                  // short human name
  description: string           // plain English what this does
  type: 'decline' | 'refer' | 'approve' | 'pricing_modifier'
  priority: number              // lower = checked first. Declines: 1-99, Refers: 100-199, Approves: 200+
  productType: 'auto' | 'home' | 'commercial' | 'all'
  conditions: RuleCondition[]
  conditionOperator: 'AND' | 'OR'
  action: RuleAction
  isActive: boolean
}
```

## Priority ranges (never break these)
- Decline rules: priority 1–99
- Refer rules: priority 100–199  
- Approve rules: priority 200–299
- Pricing modifiers: priority 300+

## When adding a new rule
1. Add it to the correct section in /lib/decision-engine/rules.ts
2. Assign the next available priority number in that range
3. Add a plain English comment above it: `// RULE_XXX: [what it does in one sentence]`
4. Export it in the DEFAULT_RULES array
5. Confirm: "Rule RULE_XXX added at priority N — triggers when [condition in plain English]"

## The scoring algorithm lives in /lib/risk-engine/scorer.ts
Score = weighted average of 6 components:
- Age factor: 15%
- Driving experience: 20%
- Violations history: 25%
- Claims history: 20%
- Vehicle factor: 10%
- Credit/income proxy: 10%
All individual scores are 0–100 integers. Higher = more risk.

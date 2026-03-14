import type { ApplicationInput, RiskLevel, RiskScoreResult, ScoreComponent } from "@/types";

const roundInt = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const ageFactor = (age: number): number => {
  if (age < 22) return 85;
  if (age <= 25) return 70;
  if (age <= 35) return 25;
  if (age <= 55) return 15;
  if (age <= 65) return 30;
  return 55;
};

const experienceFactor = (years: number): number => {
  if (years < 1) return 90;
  if (years <= 2) return 70;
  if (years <= 5) return 40;
  if (years <= 10) return 20;
  return 10;
};

const violationsFactor = (minorViolations: number, duiCount: number, duiInLast2Years: boolean): number => {
  if (duiInLast2Years) {
    return roundInt(95 + Math.max(0, duiCount - 1) * 10);
  }

  if (duiCount > 0) {
    return roundInt(80 + Math.max(0, duiCount - 1) * 10 + minorViolations * 10);
  }

  if (minorViolations <= 0) return 5;
  if (minorViolations === 1) return 30;
  if (minorViolations === 2) return 55;

  return roundInt(55 + (minorViolations - 2) * 10);
};

const claimsFactor = (claimsCount: number, atFaultClaimsCount: number): number => {
  let base = 5;
  if (claimsCount === 1) base = 30;
  else if (claimsCount === 2) base = 55;
  else if (claimsCount >= 3) base = 80;

  return roundInt(base + Math.max(0, atFaultClaimsCount) * 15);
};

const vehicleFactor = (vehicleAgeYears: number, hasModifications: boolean, isEv: boolean, isSportsCar: boolean): number => {
  let score = 15;
  if (vehicleAgeYears >= 4 && vehicleAgeYears <= 7) score = 30;
  else if (vehicleAgeYears >= 8 && vehicleAgeYears <= 12) score = 55;
  else if (vehicleAgeYears > 12) score = 75;

  if (hasModifications) score += 30;
  if (isEv) score -= 10;
  if (isSportsCar) score += 20;

  return roundInt(score);
};

const incomeFactor = (annualIncome: number): number => {
  if (annualIncome > 2500000) return 5;
  if (annualIncome >= 1000000) return 15;
  if (annualIncome >= 500000) return 30;
  if (annualIncome >= 300000) return 50;
  return 70;
};

const riskLevelFromScore = (score: number): RiskLevel => {
  if (score <= 20) return "very_low";
  if (score <= 40) return "low";
  if (score <= 60) return "medium";
  if (score <= 75) return "high";
  return "very_high";
};

export const calculateRiskScore = (input: ApplicationInput): RiskScoreResult => {
  const components: ScoreComponent[] = [
    { name: "ageFactor", score: ageFactor(input.age), weight: 0.15, contribution: 0 },
    { name: "experienceFactor", score: experienceFactor(input.drivingExperienceYears), weight: 0.2, contribution: 0 },
    { name: "violationsFactor", score: violationsFactor(input.minorViolations, input.duiCount, input.duiInLast2Years), weight: 0.25, contribution: 0 },
    { name: "claimsFactor", score: claimsFactor(input.claimsCount, input.atFaultClaimsCount), weight: 0.2, contribution: 0 },
    {
      name: "vehicleFactor",
      score: vehicleFactor(input.vehicleAgeYears, input.hasModifications, input.isEv, input.isSportsCar),
      weight: 0.1,
      contribution: 0,
    },
    { name: "incomeFactor", score: incomeFactor(input.annualIncome), weight: 0.1, contribution: 0 },
  ].map((component) => ({
    ...component,
    contribution: Number((component.score * component.weight).toFixed(2)),
  }));

  const overallScore = Math.round(components.reduce((acc, item) => acc + item.contribution, 0));

  return {
    overallScore,
    riskLevel: riskLevelFromScore(overallScore),
    scoreComponents: components,
  };
};

export type RiskGrade = "low" | "medium" | "high";

export interface RiskEngineInput {
  age: number;
  incidentsLastFiveYears: number;
  vehicleAge: number;
  annualMileage: number;
}

export interface RiskEngineResult {
  score: number;
  grade: RiskGrade;
  factors: string[];
}

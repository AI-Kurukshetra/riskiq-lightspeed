import type { PremiumBreakdown } from "@/types";

export interface PremiumCalculationParams {
  idv: number;
  vehicleAgeYears: number;
  score: number;
  ncbYears: number;
  selectedAddons: string[];
}

const baseRateByVehicleAge = (vehicleAgeYears: number): number => {
  if (vehicleAgeYears <= 1) return 0.025;
  if (vehicleAgeYears <= 3) return 0.028;
  if (vehicleAgeYears <= 5) return 0.032;
  if (vehicleAgeYears <= 7) return 0.038;
  if (vehicleAgeYears <= 10) return 0.045;
  return 0.052;
};

const ncbRateByYears = (ncbYears: number): number => {
  if (ncbYears <= 0) return 0;
  if (ncbYears === 1) return 0.2;
  if (ncbYears === 2) return 0.25;
  if (ncbYears === 3) return 0.35;
  if (ncbYears === 4) return 0.45;
  return 0.5;
};

const addonPriceMap: Record<string, number> = {
  zero_dep: 2400,
  roadside: 800,
  engine: 1200,
  return_invoice: 1800,
  personal_accident: 600,
};

export const calculatePremium = (params: PremiumCalculationParams): PremiumBreakdown => {
  const rate = baseRateByVehicleAge(params.vehicleAgeYears);
  const basePremium = Number((params.idv * rate).toFixed(2));
  const riskLoading = Number((basePremium * (params.score / 100) * 0.5).toFixed(2));
  const ncbDiscount = Number((basePremium * ncbRateByYears(params.ncbYears)).toFixed(2));

  const zeroDep = params.selectedAddons.includes("zero_dep") ? addonPriceMap.zero_dep : 0;
  const roadside = params.selectedAddons.includes("roadside") ? addonPriceMap.roadside : 0;
  const engine = params.selectedAddons.includes("engine") ? addonPriceMap.engine : 0;
  const returnInvoice = params.selectedAddons.includes("return_invoice") ? addonPriceMap.return_invoice : 0;
  const personalAccident = params.selectedAddons.includes("personal_accident") ? addonPriceMap.personal_accident : 0;

  const addonCosts = zeroDep + roadside + engine + returnInvoice + personalAccident;
  const finalPremium = Number((basePremium + riskLoading - ncbDiscount + addonCosts).toFixed(2));

  return {
    basePremium,
    riskLoading,
    ncbDiscount,
    zeroDep,
    roadside,
    engine,
    returnInvoice,
    personalAccident,
    addonCosts,
    finalPremium,
  };
};

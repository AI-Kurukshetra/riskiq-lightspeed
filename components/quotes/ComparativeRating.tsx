"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type CoverageType = "third_party" | "third_party_fire_theft" | "comprehensive";

type Props = {
  idv: number;
  overallScore: number;
  ncbYears: number;
  vehicleAge: number;
  onProceed?: (coverage: CoverageType, finalPremium: number) => Promise<void> | void;
  busy?: boolean;
};

const addonCatalog = [
  { id: "zero_dep", label: "Zero Depreciation", price: 2400 },
  { id: "roadside", label: "Roadside Assistance", price: 800 },
  { id: "engine", label: "Engine Protection", price: 1200 },
  { id: "return_invoice", label: "Return to Invoice", price: 1800 },
  { id: "personal_accident", label: "Personal Accident", price: 600 },
];

const coverageMultiplier: Record<CoverageType, number> = {
  third_party: 0.75,
  third_party_fire_theft: 0.92,
  comprehensive: 1,
};

const ncbRate = (ncbYears: number): number => {
  if (ncbYears <= 0) return 0;
  if (ncbYears === 1) return 0.2;
  if (ncbYears === 2) return 0.25;
  if (ncbYears === 3) return 0.35;
  if (ncbYears === 4) return 0.45;
  return 0.5;
};

const rateByAge = (age: number): number => {
  if (age <= 1) return 0.025;
  if (age <= 3) return 0.028;
  if (age <= 5) return 0.032;
  if (age <= 7) return 0.038;
  if (age <= 10) return 0.045;
  return 0.052;
};

const formatCurrency = (value: number): string => `₹${Math.round(value).toLocaleString("en-IN")}`;

export const ComparativeRating = ({ idv, overallScore, ncbYears, vehicleAge, onProceed, busy = false }: Props) => {
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedCoverage, setSelectedCoverage] = useState<CoverageType>("comprehensive");

  const calculations = useMemo(() => {
    const addonCost = addonCatalog
      .filter((addon) => selectedAddons.includes(addon.id))
      .reduce((acc, addon) => acc + addon.price, 0);

    return (Object.keys(coverageMultiplier) as CoverageType[]).map((coverage) => {
      const baseRate = rateByAge(vehicleAge) * coverageMultiplier[coverage];
      const basePremium = idv * baseRate;
      const riskLoading = basePremium * (overallScore / 100) * 0.5;
      const discount = basePremium * ncbRate(ncbYears);
      const finalPremium = basePremium + riskLoading - discount + addonCost;

      return {
        coverage,
        basePremium,
        riskLoading,
        discount,
        addonCost,
        finalPremium,
      };
    });
  }, [idv, ncbYears, overallScore, selectedAddons, vehicleAge]);

  const selectedPlan = calculations.find((item) => item.coverage === selectedCoverage) ?? calculations[2];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {calculations.map((plan) => {
          const isSelected = selectedCoverage === plan.coverage;
          const title =
            plan.coverage === "third_party"
              ? "Third Party"
              : plan.coverage === "third_party_fire_theft"
                ? "Third Party + Fire & Theft"
                : "Comprehensive";

          return (
            <div key={plan.coverage} className={cn("rounded-card border bg-surface p-4 transition", isSelected ? "border-accent ring-2 ring-accent/30" : "border-border")}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="font-heading text-xl">{title}</h3>
                {plan.coverage === "third_party" ? <span className="rounded bg-slate-500/20 px-2 py-0.5 text-xs text-slate-300">Legally Required</span> : null}
                {plan.coverage === "third_party_fire_theft" ? <span className="rounded bg-accent/20 px-2 py-0.5 text-xs text-accent">Popular Choice</span> : null}
                {plan.coverage === "comprehensive" ? <span className="rounded bg-status-approved/20 px-2 py-0.5 text-xs text-status-approved">Recommended</span> : null}
              </div>

              <p className="font-heading text-3xl">{formatCurrency(plan.finalPremium)}/yr</p>
              <div className="mt-3 space-y-1 text-xs text-muted">
                <p>Base Premium: {formatCurrency(plan.basePremium)}</p>
                <p>Risk Loading: +{formatCurrency(plan.riskLoading)}</p>
                <p>NCB Discount: -{formatCurrency(plan.discount)}</p>
                <p className="border-t border-border pt-1 text-foreground">Total: {formatCurrency(plan.finalPremium)}/yr</p>
              </div>

              <ul className="mt-3 space-y-1 text-xs">
                <li>{plan.coverage === "third_party" ? "✗" : "✓"} Own damage coverage</li>
                <li>{plan.coverage === "comprehensive" || plan.coverage === "third_party_fire_theft" ? "✓" : "✗"} Fire & theft coverage</li>
                <li>✓ Third party liability coverage</li>
              </ul>

              <Button
                variant={isSelected ? "default" : "outline"}
                className={cn("mt-4 w-full", isSelected && "bg-accent text-white")}
                onClick={() => setSelectedCoverage(plan.coverage)}
              >
                {isSelected ? "Selected" : "Select"}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="rounded-card border border-border bg-surface p-4">
        <h4 className="font-medium">Customize with Add-ons</h4>
        <p className="text-xs text-muted">Price shown updates automatically as you select add-ons.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {addonCatalog.map((addon) => (
            <label key={addon.id} className="flex items-center gap-2 rounded border border-border px-3 py-2 text-sm">
              <Checkbox
                checked={selectedAddons.includes(addon.id)}
                onCheckedChange={(checked) => {
                  setSelectedAddons((prev) =>
                    checked === true ? [...new Set([...prev, addon.id])] : prev.filter((item) => item !== addon.id),
                  );
                }}
              />
              <span>{addon.label}</span>
              <span className="ml-auto text-muted">+{formatCurrency(addon.price)}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-3 rounded-card border border-accent/40 bg-accent/10 p-4 md:flex-row md:items-center">
        <div>
          <p className="text-xs text-muted">Selected Plan Summary</p>
          <p className="font-heading text-2xl capitalize">{selectedCoverage.replaceAll("_", " ")}</p>
          <p className="text-accent">{formatCurrency(selectedPlan.finalPremium)}/yr</p>
          <p className="mt-1 text-xs text-muted">This saves the preferred premium plan. Payment collection is handled separately from this demo workflow.</p>
        </div>
        <Button
          className="bg-accent text-white"
          disabled={busy}
          onClick={() => {
            void onProceed?.(selectedCoverage, selectedPlan.finalPremium);
          }}
        >
          {busy ? "Updating..." : "Save selected plan"}
        </Button>
      </div>
    </div>
  );
};

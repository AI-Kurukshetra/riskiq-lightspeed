"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileDown } from "lucide-react";

import { selectQuoteCoverage, updateQuoteStatus } from "@/actions/underwriting";
import { ComparativeRating } from "@/components/quotes/ComparativeRating";
import { Button } from "@/components/ui/button";

type CoverageType = "third_party" | "third_party_fire_theft" | "comprehensive";

type Props = {
  quoteId: string;
  quoteNumber: string | null;
  quoteStatus: string;
  validUntil: string | null;
  pdfUrl: string | null;
  idv: number;
  overallScore: number;
  ncbYears: number;
  vehicleAge: number;
};

export function QuoteInteractivePanel({
  quoteId,
  quoteNumber,
  quoteStatus,
  validUntil,
  pdfUrl,
  idv,
  overallScore,
  ncbYears,
  vehicleAge,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const clearMessages = (): void => {
    setActionError(null);
    setActionSuccess(null);
  };

  const onProceed = async (coverage: CoverageType): Promise<void> => {
    clearMessages();
    setBusy(true);
    const result = await selectQuoteCoverage(quoteId, coverage);
    setBusy(false);

    if (!result.success) {
      setActionError(result.error);
      return;
    }

    setActionSuccess(`Plan updated to ${coverage.replaceAll("_", " ")}.`);
    router.refresh();
  };

  const onUpdateStatus = async (status: string): Promise<void> => {
    clearMessages();
    setBusy(true);
    const result = await updateQuoteStatus(quoteId, status);
    setBusy(false);

    if (!result.success) {
      setActionError(result.error);
      return;
    }

    setActionSuccess(status === "accepted" ? "Quote accepted successfully." : "Quote sent for changes.");
    router.push("/quotes");
    router.refresh();
  };

  const onDownload = (): void => {
    clearMessages();
    void pdfUrl; // reserved for future pre-generated PDFs
    window.location.href = `/api/quotes/${quoteId}/pdf`;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
        <div>
          <p className="text-xs text-muted">Quote</p>
          <p className="font-heading text-xl">{quoteNumber ?? "Quote"}</p>
          <p className="text-sm text-muted">
            Status: <span className="capitalize">{quoteStatus}</span> · Valid until{" "}
            {validUntil ? new Date(validUntil).toLocaleDateString("en-IN") : "-"}
          </p>
        </div>
        <Button variant="outline" onClick={onDownload}>
          <FileDown className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      <ComparativeRating
        idv={idv}
        overallScore={overallScore}
        ncbYears={ncbYears}
        vehicleAge={vehicleAge}
        onProceed={onProceed}
        busy={busy}
      />

      <div className="flex flex-wrap gap-3">
        <Button className="bg-status-approved text-white" disabled={busy} onClick={() => void onUpdateStatus("accepted")}>
          {busy ? "Please wait..." : "Accept This Quote"}
        </Button>
        <Button variant="outline" disabled={busy} onClick={() => void onUpdateStatus("changes_requested")}>
          Request Changes
        </Button>
      </div>

      <p className="text-sm text-muted">
        Quotes are premium proposals for the applicant to review. Accepting a quote marks it ready for follow-up and policy issuance; payment collection is still handled manually outside this demo unless we add a gateway.
      </p>

      {actionError ? <p className="text-sm text-status-declined">{actionError}</p> : null}
      {actionSuccess ? <p className="text-sm text-status-approved">{actionSuccess}</p> : null}
    </div>
  );
}

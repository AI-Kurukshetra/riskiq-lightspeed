import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { QuoteInteractivePanel } from "@/components/quotes/QuoteInteractivePanel";
import { Button } from "@/components/ui/button";
import { createServerClient } from "@/lib/supabase/server";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single();
  if (!profile) redirect("/login");

  const { data: quote } = await supabase
    .from("quotes")
    .select("id,application_id,quote_number,status,valid_until,idv,final_premium,pdf_url")
    .eq("id", id)
    .single();

  if (!quote) notFound();

  const { data: application } = await supabase
    .from("applications")
    .select("id,organization_id,raw_form_data")
    .eq("id", quote.application_id)
    .single();

  if (!application || application.organization_id !== profile.organization_id) notFound();

  const raw = (application.raw_form_data as Record<string, unknown> | null) ?? {};

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="outline">
          <Link href="/quotes">Back to Quotes</Link>
        </Button>
      </div>
      <QuoteInteractivePanel
        quoteId={quote.id}
        quoteNumber={quote.quote_number}
        quoteStatus={quote.status}
        validUntil={quote.valid_until}
        pdfUrl={quote.pdf_url}
        idv={Number(quote.idv ?? raw.idv ?? 1000000)}
        overallScore={Number(raw.overallScore ?? 50)}
        ncbYears={Number(raw.ncbYears ?? 0)}
        vehicleAge={Number(raw.vehicleAgeYears ?? 2)}
      />
    </div>
  );
}

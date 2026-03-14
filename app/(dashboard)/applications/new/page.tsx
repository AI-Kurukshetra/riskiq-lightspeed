import { ApplicationForm } from "@/components/forms/ApplicationForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function NewApplicationPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="space-y-4">
      <div>
        <Button asChild variant="outline">
          <Link href="/applications">Back to Applications</Link>
        </Button>
      </div>
      <div>
        <h1 className="font-heading text-3xl">New Application</h1>
        <p className="text-sm text-muted">Complete all six steps to submit for underwriting.</p>
      </div>
      <ApplicationForm draftIdFromQuery={params.draft ?? null} />
    </div>
  );
}

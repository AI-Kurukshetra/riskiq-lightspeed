"use client";

import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Info,
  ShieldAlert,
  Upload,
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { JSX } from "react";

import { addDocumentRecord } from "@/actions/documents";
import { createDocumentSignedUploadUrl } from "@/actions/storage";
import { makeDecision } from "@/actions/underwriting";
import { UnderwritingAssistant } from "@/components/ai/UnderwritingAssistant";
import { ComparativeRating } from "@/components/quotes/ComparativeRating";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

type Props = {
  role: string;
  application: Record<string, unknown>;
  riskScore: Record<string, unknown> | null;
  decision: Record<string, unknown> | null;
  quote: Record<string, unknown> | null;
  documents: Array<Record<string, unknown>>;
  auditLogs: Array<Record<string, unknown>>;
};

const statusClass = (status: string): string => {
  if (status === "approved") return "bg-status-approved/20 text-status-approved";
  if (status === "referred") return "bg-status-referred/20 text-status-referred";
  if (status === "declined") return "bg-status-declined/20 text-status-declined";
  if (status === "processing") return "bg-status-processing/20 text-status-processing";
  if (status === "submitted") return "bg-status-processing/20 text-status-processing";
  return "bg-status-draft/20 text-status-draft";
};

const formatSize = (bytes: number | null): string => {
  if (!bytes) return "-";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};

const safeRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const safeArray = (value: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
};

const humanStatusMessage = (status: string): string => {
  if (status === "draft") return "Draft saved. Complete and submit to start automated underwriting.";
  if (status === "submitted") return "Submitted. System will process and score this application.";
  if (status === "referred") return "Referred to underwriting queue for manual review.";
  if (status === "approved") return "Approved. Quote is generated and ready for acceptance.";
  if (status === "declined") return "Declined based on rule and risk analysis.";
  if (status === "processing") return "Processing by risk and decision engine.";
  return "Application is in pipeline.";
};

const statusSteps = [
  { key: "draft", label: "Draft" },
  { key: "submitted", label: "Submitted" },
  { key: "processing", label: "Processing" },
  { key: "referred", label: "Manual Review" },
  { key: "approved", label: "Quote Ready" },
];

const formatDate = (value: unknown): string => {
  if (typeof value !== "string" || !value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const ApplicationDetailTabs = ({ role, application, riskScore, decision, quote, documents, auditLogs }: Props): JSX.Element => {
  const router = useRouter();
  const [uploadType, setUploadType] = useState<"proposal_form" | "id_proof" | "vehicle_inspection" | "claim_history" | "other">("id_proof");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");

  const appStatus = String(application.status ?? "draft");
  const rawForm = safeRecord(application.raw_form_data);
  const driving = safeRecord(application.driving_history);
  const vehicle = safeRecord(application.vehicle_details);
  const applicantAddress = safeRecord(application.applicant_address);

  const score = Number(riskScore?.overall_score ?? 0);
  const circumference = 2 * Math.PI * 86;
  const filled = (score / 100) * circumference;

  const scoreComponents = Array.isArray(riskScore?.score_components)
    ? (riskScore?.score_components as Array<Record<string, unknown>>)
    : [];

  const triggers = Array.isArray(decision?.triggered_rules)
    ? (decision?.triggered_rules as string[])
    : [];

  const fraudSignals = safeRecord(riskScore?.fraud_signals);

  const sourceRows = useMemo(() => {
    const accidents = safeArray(driving.accidents);
    const violations = safeArray(driving.violations);
    const atFault = accidents.filter((item) => item.atFault === true).length;

    return [
      {
        name: "Credit Bureau",
        sample: "Credit Score: 742, Payment History: Good, Outstanding Loans: 2, Credit Utilization: 34%",
      },
      {
        name: "Motor Vehicle Record (MVR)",
        sample: `License Status: Valid, Violations on Record: ${violations.length}, License Class: ${String(driving.licenseType ?? "LMV")}, Last Renewed: 2024`,
      },
      {
        name: "CLUE Report",
        sample: `Claims in Last 5 Years: ${accidents.length}, At-fault Claims: ${atFault}, Insurance Score: 78/100`,
      },
    ];
  }, [driving]);

  const currentStepIndex = Math.max(0, statusSteps.findIndex((item) => item.key === appStatus));
  const canDecide = ["underwriter", "admin", "super_admin"].includes(role) && appStatus === "referred";
  const triggerCards = triggers.length > 0 ? triggers : ["No explicit rules recorded."];
  const hasDocuments = documents.length > 0;
  const hasAuditLogs = auditLogs.length > 0;

  const handleUpload = async (): Promise<void> => {
    if (!uploadFile) return;

    if (!["application/pdf", "image/jpeg", "image/png"].includes(uploadFile.type)) {
      setUploadError("Only PDF/JPG/PNG files are allowed.");
      return;
    }

    if (uploadFile.size > 5 * 1024 * 1024) {
      setUploadError("Max file size is 5MB.");
      return;
    }

    setUploading(true);
    setUploadError("");

    const uploadUrlResult = await createDocumentSignedUploadUrl({
      applicationId: String(application.id),
      documentType: uploadType,
      fileName: uploadFile.name,
      extensionHint: uploadFile.name.toLowerCase().split(".").pop() as "pdf" | "jpg" | "jpeg" | "png" | undefined,
    });

    if (!uploadUrlResult.success) {
      setUploading(false);
      setUploadError(uploadUrlResult.error);
      return;
    }

    const supabase = createClient();
    const uploadResp = await supabase.storage
      .from("documents")
      .uploadToSignedUrl(uploadUrlResult.data.path, uploadUrlResult.data.token, uploadFile);

    if (uploadResp.error) {
      setUploading(false);
      setUploadError(uploadResp.error.message);
      return;
    }

    const insertResult = await addDocumentRecord({
      applicationId: String(application.id),
      documentType: uploadType,
      fileName: uploadFile.name,
      fileUrl: uploadUrlResult.data.path,
      fileSizeBytes: uploadFile.size,
    });

    setUploading(false);

    if (!insertResult.success) {
      setUploadError(insertResult.error);
      return;
    }

    window.location.reload();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">Application Detail</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">{String(application.application_number ?? "Application")}</h1>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusClass(appStatus)}`}>{appStatus}</span>
            <span className="text-sm text-muted">Submitted {formatDate(application.submitted_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {appStatus === "draft" ? (
            <Button asChild>
              <Link href={`/applications/new?draft=${String(application.id)}`}>Complete Application</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/applications">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Applications
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Workflow status</CardTitle>
            <p className="text-sm text-muted">{humanStatusMessage(appStatus)}</p>
          </CardHeader>
          <CardContent className="grid gap-3 p-0 md:grid-cols-5">
            {statusSteps.map((item, index) => {
              const active = index <= currentStepIndex || item.key === appStatus;

              return (
                <div
                  key={item.key}
                  className={`rounded-2xl border p-4 text-sm ${
                    item.key === appStatus
                      ? "border-accent bg-accent/10 text-foreground"
                      : active
                        ? "border-accent/20 bg-background text-foreground"
                        : "border-border bg-background/70 text-muted"
                  }`}
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">Step {index + 1}</p>
                  <p className="mt-2 font-medium">{item.label}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle>External data sources</CardTitle>
            <p className="text-sm text-muted">Data automatically fetched during application processing.</p>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            {sourceRows.map((row) => (
              <div key={row.name} className="rounded-2xl border border-border bg-background/70 p-4">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4 text-status-approved" />
                  {row.name}
                  <span className="rounded-full bg-status-approved/10 px-2 py-0.5 text-[11px] font-medium text-status-approved">Verified</span>
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">{row.sample}</p>
              </div>
            ))}
            <p className="text-right text-xs text-muted">Simulated data for demonstration</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 gap-2 rounded-[22px] border border-border bg-surface/90 p-2 md:grid-cols-4">
          <TabsTrigger value="overview" className="min-h-12 rounded-2xl">Overview</TabsTrigger>
          <TabsTrigger value="risk" className="min-h-12 rounded-2xl">Risk Analysis</TabsTrigger>
          <TabsTrigger value="documents" className="min-h-12 rounded-2xl">Documents</TabsTrigger>
          <TabsTrigger value="history" className="min-h-12 rounded-2xl">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className={`rounded-2xl border p-4 ${statusClass(appStatus)}`}>
            <p className="font-medium capitalize">Status: {appStatus}</p>
            {decision?.decision_reason ? <p className="mt-1 text-sm">{String(decision.decision_reason)}</p> : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Applicant information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-0 text-sm">
                <p><span className="text-muted">Name:</span> {String(application.applicant_name ?? "-")}</p>
                <p><span className="text-muted">Email:</span> {String(application.applicant_email ?? "-")}</p>
                <p><span className="text-muted">Phone:</span> {String(application.applicant_phone ?? "-")}</p>
                <p><span className="text-muted">DOB:</span> {String(application.applicant_dob ?? "-")}</p>
                <p><span className="text-muted">Address:</span> {`${String(applicantAddress.line1 ?? "")}, ${String(applicantAddress.city ?? "")}, ${String(applicantAddress.state ?? "")}`}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Vehicle information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 p-0 text-sm">
                <p><span className="text-muted">Type:</span> {String(vehicle.vehicleType ?? "-")}</p>
                <p><span className="text-muted">Make / Model:</span> {String(vehicle.make ?? "-")} {String(vehicle.model ?? "")}</p>
                <p><span className="text-muted">Year:</span> {String(vehicle.year ?? "-")}</p>
                <p><span className="text-muted">Registration:</span> {String(vehicle.registrationNumber ?? "-")}</p>
                <p><span className="text-muted">Fuel:</span> {String(vehicle.fuelType ?? "-")}</p>
                <p><span className="text-muted">Usage:</span> {String(vehicle.usage ?? "-")}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Driving history</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 p-0 text-sm md:grid-cols-2">
              <div className="space-y-2">
                <p><span className="text-muted">Experience:</span> {String(driving.drivingExperienceYears ?? "-")} years</p>
                <p><span className="text-muted">License:</span> {String(driving.licenseNumber ?? "-")} ({String(driving.licenseType ?? "-")})</p>
              </div>
              <div className="space-y-2">
                <p><span className="text-muted">Accidents:</span> {safeArray(driving.accidents).length}</p>
                <p><span className="text-muted">Violations:</span> {safeArray(driving.violations).length}</p>
              </div>
            </CardContent>
          </Card>

          {appStatus === "approved" && quote ? (
            <ComparativeRating
              idv={Number(quote.idv ?? rawForm.idv ?? 1000000)}
              overallScore={score}
              ncbYears={Number(rawForm.ncbYears ?? 0)}
              vehicleAge={Number(rawForm.vehicleAgeYears ?? 2)}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <Card className="overflow-hidden">
              <CardHeader className="pb-4 text-center">
                <CardTitle>Risk score</CardTitle>
                <p className="text-sm text-muted">Composite score generated from weighted factors.</p>
              </CardHeader>
              <CardContent className="relative overflow-hidden p-0 text-center">
                <div className="pointer-events-none absolute inset-x-10 top-10 h-28 rounded-full bg-accent/10 blur-3xl" />
                <svg width="220" height="220" className="mx-auto">
                  <circle cx="110" cy="110" r="86" stroke="currentColor" strokeOpacity="0.1" strokeWidth="14" fill="none" />
                  <circle
                    cx="110"
                    cy="110"
                    r="86"
                    stroke={score <= 40 ? "#22C55E" : score <= 60 ? "#EAB308" : score <= 75 ? "#f97316" : "#EF4444"}
                    strokeWidth="14"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${filled} ${circumference}`}
                    transform="rotate(-90 110 110)"
                    style={{ filter: "drop-shadow(0 0 14px rgba(14,165,233,0.28))" }}
                  />
                  <text x="110" y="105" textAnchor="middle" className="fill-current text-5xl font-semibold">{score}</text>
                  <text x="110" y="132" textAnchor="middle" className="fill-current text-sm text-muted">
                    {String(riskScore?.risk_level ?? "-")}
                  </text>
                </svg>
                <div className="mx-auto mb-2 flex w-fit items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                  <span className="inline-block h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_rgba(14,165,233,0.8)]" />
                  Real-time risk signal
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Score breakdown</CardTitle>
                <p className="text-sm text-muted">Individual component scores used to form the final risk level.</p>
              </CardHeader>
              <CardContent className="space-y-4 p-0">
                {scoreComponents.map((item, idx) => {
                  const itemScore = Number(item.score ?? 0);
                  const color = itemScore < 30 ? "bg-status-approved" : itemScore <= 60 ? "bg-status-referred" : itemScore <= 80 ? "bg-orange-500" : "bg-status-declined";
                  return (
                    <div key={idx} className="rounded-2xl border border-border bg-background/70 p-4">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{String(item.name ?? "Factor")}</span>
                          {item.weight ? (
                            <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted">{String(item.weight)} weight</span>
                          ) : null}
                        </div>
                        <span className="text-sm font-semibold">{itemScore}</span>
                      </div>
                      <div className="h-2 rounded-full bg-border/80">
                        <div className={`h-2 rounded-full ${color}`} style={{ width: `${itemScore}%`, boxShadow: "0 0 12px rgba(255,255,255,0.12)" }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Triggered rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-0">
                {triggerCards.map((rule) => (
                  <div key={rule} className="rounded-2xl border-l-4 border-status-referred bg-background p-4 text-sm">
                    {rule}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Fraud signals</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {Number(fraudSignals.probability ?? 0) > 60 ? (
                  <div className="rounded-2xl border border-status-declined/40 bg-status-declined/10 p-4 text-sm">
                    <p className="font-medium text-status-declined"><ShieldAlert className="mr-1 inline h-4 w-4" /> Fraud Risk Detected</p>
                    <p className="mt-1">Probability: {String(fraudSignals.probability)}%</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-status-approved/40 bg-status-approved/10 p-4 text-sm text-status-approved">
                    No fraud signals detected
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0 text-sm italic text-muted">
              <Info className="mr-1 inline h-4 w-4" /> {String(riskScore?.explanation ?? "No explanation available")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <div className="flex justify-end">
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Upload document</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Document Type</Label>
                    <Select value={uploadType} onValueChange={(value) => setUploadType(value as typeof uploadType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="proposal_form">Proposal Form</SelectItem>
                        <SelectItem value="id_proof">ID Proof</SelectItem>
                        <SelectItem value="vehicle_inspection">Vehicle Inspection</SelectItem>
                        <SelectItem value="claim_history">Claim History</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
                  {uploadError ? <p className="text-sm text-status-declined">{uploadError}</p> : null}
                  <Button onClick={() => void handleUpload()} disabled={uploading} className="w-full">
                    {uploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {hasDocuments ? (
            <div className="grid gap-4 md:grid-cols-2">
              {documents.map((doc) => {
                const isPdf = String(doc.file_name ?? "").toLowerCase().endsWith(".pdf");
                return (
                  <Card key={String(doc.id)}>
                    <CardContent className="flex items-start gap-4 p-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                        {isPdf ? <FileText className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{String(doc.file_name ?? "Unnamed")}</p>
                        <p className="mt-1 text-sm text-muted">
                          {formatSize((doc.file_size_bytes as number | null) ?? null)} · {formatDate(doc.created_at)}
                        </p>
                        <a href={String(doc.file_url ?? "#")} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent" target="_blank" rel="noreferrer">
                          Download
                          <ChevronRight className="h-4 w-4" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 p-0 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Upload className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-base font-medium">No documents uploaded yet</p>
                  <p className="text-sm text-muted">Upload ID proofs, inspections, or policy files to keep the case file complete.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Activity timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {hasAuditLogs ? (
                <div className="space-y-5">
                  {auditLogs.map((log) => (
                    <div key={String(log.id)} className="relative border-l border-border pl-5">
                      <span className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-accent shadow-[0_0_10px_rgba(14,165,233,0.8)]" />
                      <p className="text-sm font-medium">{String(log.action_type ?? "Action")}</p>
                      <p className="text-sm text-muted">by {String(log.actor_name ?? "System")} · {formatDate(log.created_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-40 items-center justify-center text-sm text-muted">No audit activity recorded for this application yet.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {canDecide ? (
        <Card className="border-status-referred/40 bg-status-referred/10">
          <CardHeader className="pb-4">
            <CardTitle className="text-status-referred">This application requires your decision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface p-4 text-sm">Score: {score}</div>
              <div className="rounded-2xl border border-border bg-surface p-4 text-sm">Triggered Rules: {triggers.join(", ") || "-"}</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-status-approved hover:bg-status-approved/90">Approve</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Approval</DialogTitle>
                  </DialogHeader>
                  <Textarea placeholder="Optional notes" value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} />
                  <Button
                    onClick={() =>
                      void makeDecision(String(application.id), "approved", "Approved by underwriter", decisionNotes).then(() => {
                        router.push("/underwriting");
                        router.refresh();
                      })
                    }
                    className="bg-status-approved hover:bg-status-approved/90"
                  >
                    Confirm
                  </Button>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-status-declined hover:bg-status-declined/90">Decline</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Decline Application</DialogTitle>
                  </DialogHeader>
                  <Select value={decisionReason} onValueChange={setDecisionReason}>
                    <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DUI History">DUI History</SelectItem>
                      <SelectItem value="Excessive Claims">Excessive Claims</SelectItem>
                      <SelectItem value="Score Too High">Score Too High</SelectItem>
                      <SelectItem value="Vehicle Not Eligible">Vehicle Not Eligible</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Notes" value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} />
                  <Button
                    onClick={() =>
                      void makeDecision(String(application.id), "declined", decisionReason || "Declined", decisionNotes).then(() => {
                        router.push("/underwriting");
                        router.refresh();
                      })
                    }
                    className="bg-status-declined hover:bg-status-declined/90"
                  >
                    Confirm
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <UnderwritingAssistant applicationId={String(application.id)} />
    </motion.div>
  );
};

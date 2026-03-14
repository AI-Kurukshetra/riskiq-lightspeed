"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Check, CheckCircle2, ChevronRight, CloudUpload, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import type { FieldErrors } from "react-hook-form";

import { validateApplicantEmail } from "@/actions/application-validation";
import { processApplication } from "@/actions/process-application";
import { createDocumentSignedUploadUrl } from "@/actions/storage";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { INDIAN_STATES_AND_UTS } from "@/lib/constants/india";
import {
  applicationFormSchema,
  type ApplicationFormValues,
} from "@/lib/validators/application";
import { calculatePremium } from "@/lib/premium-calculator/calculator";
import { cn } from "@/lib/utils";

const steps = ["Applicant", "Vehicle", "Driving", "Coverage", "Documents", "Review"];

const defaultValues: ApplicationFormValues = {
  applicant: {
    fullName: "",
    email: "",
    phone: "",
    dob: "",
    pan: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    occupation: "Salaried",
    annualIncomeBand: "5-10",
  },
  vehicle: {
    vehicleType: "car",
    make: "",
    model: "",
    year: 2024,
    registrationNumber: "",
    vin: "",
    fuelType: "petrol",
    usage: "personal",
    parking: "garage",
    hasModifications: false,
  },
  driving: {
    drivingExperienceYears: 1,
    licenseNumber: "",
    licenseType: "lmv",
    accidents: [],
    violations: [],
    previousInsurance: false,
    previousInsurer: "",
    yearsInsured: 0,
    ncbYears: 0,
  },
  coverage: {
    coverageType: "comprehensive",
    addons: [],
    idv: 750000,
  },
  documents: {
    idProof: "",
    vehicleRc: "",
    previousPolicy: "",
  },
  review: {
    acceptTerms: true,
  },
};

const addonOptions = [
  { id: "zero_dep", label: "Zero Depreciation", price: 2400 },
  { id: "roadside", label: "Roadside Assistance", price: 800 },
  { id: "engine", label: "Engine Protection", price: 1200 },
  { id: "return_invoice", label: "Return to Invoice", price: 1800 },
  { id: "personal_accident", label: "Personal Accident", price: 600 },
];

const incomeFromBand = (band: string): number => {
  if (band === "under3") return 250000;
  if (band === "3-5") return 400000;
  if (band === "5-10") return 750000;
  if (band === "10-25") return 1500000;
  return 3000000;
};

type ApplicationFormProps = {
  draftIdFromQuery?: string | null;
};

const readRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const readArray = (value: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
  }
  return [];
};

const asString = (value: unknown): string => (typeof value === "string" ? value : "");
const asNumber = (value: unknown, fallback = 0): number => (typeof value === "number" ? value : fallback);
const asBoolean = (value: unknown): boolean => value === true;

const collectErrorMessages = (errorNode: unknown): string[] => {
  if (!errorNode || typeof errorNode !== "object") return [];
  const node = errorNode as Record<string, unknown>;
  const messages: string[] = [];

  if (typeof node.message === "string" && node.message.trim()) {
    messages.push(node.message);
  }

  Object.values(node).forEach((value) => {
    if (value && typeof value === "object") {
      messages.push(...collectErrorMessages(value));
    }
  });

  return Array.from(new Set(messages));
};

const normalizeSubmitError = (error: string): string => {
  if (error.includes('"path":["age"]') || error.toLowerCase().includes("expected number to be >=16")) {
    return "Applicant age must be 16+ years. Please update Date of Birth in Step 1.";
  }

  try {
    const parsed = JSON.parse(error) as Array<{ message?: string; path?: string[] }>;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      if (first.path?.[0] === "age") {
        return "Applicant age must be 16+ years. Please update Date of Birth in Step 1.";
      }
      if (first.message) return first.message;
    }
  } catch {
    return error;
  }

  return error;
};

const mapDraftToForm = (draft: Record<string, unknown>): ApplicationFormValues => {
  const applicantAddress = readRecord(draft.applicant_address);
  const vehicle = readRecord(draft.vehicle_details);
  const driving = readRecord(draft.driving_history);
  const coverage = readRecord(draft.coverage_selection);

  return {
    applicant: {
      fullName: asString(draft.applicant_name),
      email: asString(draft.applicant_email),
      phone: asString(draft.applicant_phone),
      dob: asString(draft.applicant_dob),
      pan: "",
      addressLine1: asString(applicantAddress.line1),
      addressLine2: asString(applicantAddress.line2),
      city: asString(applicantAddress.city),
      state: asString(applicantAddress.state),
      pincode: asString(applicantAddress.pincode),
      occupation: asString(applicantAddress.occupation) || "Salaried",
      annualIncomeBand: asString(applicantAddress.annualIncomeBand) || "5-10",
    },
    vehicle: {
      vehicleType: (asString(vehicle.vehicleType) as ApplicationFormValues["vehicle"]["vehicleType"]) || "car",
      make: asString(vehicle.make),
      model: asString(vehicle.model),
      year: asNumber(vehicle.year, 2024),
      registrationNumber: asString(vehicle.registrationNumber),
      vin: asString(vehicle.vin),
      fuelType: (asString(vehicle.fuelType) as ApplicationFormValues["vehicle"]["fuelType"]) || "petrol",
      usage: (asString(vehicle.usage) as ApplicationFormValues["vehicle"]["usage"]) || "personal",
      parking: (asString(vehicle.parking) as ApplicationFormValues["vehicle"]["parking"]) || "garage",
      hasModifications: asBoolean(vehicle.hasModifications),
    },
    driving: {
      drivingExperienceYears: asNumber(driving.drivingExperienceYears, 1),
      licenseNumber: asString(driving.licenseNumber),
      licenseType: (asString(driving.licenseType) as ApplicationFormValues["driving"]["licenseType"]) || "lmv",
      accidents: readArray(driving.accidents).map((item) => ({
        date: asString(item.date),
        description: asString(item.description),
        atFault: asBoolean(item.atFault),
      })),
      violations: readArray(driving.violations).map((item) => ({
        date: asString(item.date),
        type: (asString(item.type) as ApplicationFormValues["driving"]["violations"][number]["type"]) || "speeding",
      })),
      previousInsurance: asBoolean(driving.previousInsurance),
      previousInsurer: asString(driving.previousInsurer),
      yearsInsured: asNumber(driving.yearsInsured, 0),
      ncbYears: asNumber(driving.ncbYears, 0),
    },
    coverage: {
      coverageType: (asString(coverage.coverageType) as ApplicationFormValues["coverage"]["coverageType"]) || "comprehensive",
      addons: Array.isArray(coverage.addons) ? coverage.addons.filter((item): item is string => typeof item === "string") : [],
      idv: asNumber(coverage.idv, 750000),
    },
    documents: {
      idProof: "",
      vehicleRc: "",
      previousPolicy: "",
    },
    review: {
      acceptTerms: true,
    },
  };
};

export const ApplicationForm = ({ draftIdFromQuery = null }: ApplicationFormProps) => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftBanner, setDraftBanner] = useState<{ id: string; number: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [docErrors, setDocErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ApplicationFormValues>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues,
    mode: "onChange",
  });
  const {
    formState: { errors },
  } = form;

  const { fields: accidentFields, append: appendAccident, remove: removeAccident } = useFieldArray({
    control: form.control,
    name: "driving.accidents",
  });

  const { fields: violationFields, append: appendViolation, remove: removeViolation } = useFieldArray({
    control: form.control,
    name: "driving.violations",
  });

  const values = form.watch();

  const currentStepErrors = useMemo(() => {
    const scopedErrors: FieldErrors<ApplicationFormValues> | unknown =
      currentStep === 1
        ? errors.applicant
        : currentStep === 2
          ? errors.vehicle
          : currentStep === 3
            ? errors.driving
            : currentStep === 4
              ? errors.coverage
              : currentStep === 5
                ? errors.documents
                : errors.review;

    return collectErrorMessages(scopedErrors).slice(0, 6);
  }, [currentStep, errors]);

  const estimatedPremium = useMemo(() => {
    const addonSelection = values.coverage.addons;
    return calculatePremium({
      idv: values.coverage.idv,
      ncbYears: values.driving.ncbYears,
      selectedAddons: addonSelection,
      score: 45,
      vehicleAgeYears: Math.max(0, 2026 - values.vehicle.year),
    });
  }, [values.coverage.addons, values.coverage.idv, values.driving.ncbYears, values.vehicle.year]);

  const buildDraftPayload = () => ({
    applicant_name: values.applicant.fullName || null,
    applicant_email: values.applicant.email || null,
    applicant_phone: values.applicant.phone || null,
    applicant_dob: values.applicant.dob || null,
    applicant_address: {
      line1: values.applicant.addressLine1,
      line2: values.applicant.addressLine2,
      city: values.applicant.city,
      state: values.applicant.state,
      pincode: values.applicant.pincode,
      occupation: values.applicant.occupation,
      annualIncomeBand: values.applicant.annualIncomeBand,
    },
    vehicle_details: values.vehicle,
    driving_history: values.driving,
    coverage_selection: values.coverage,
    raw_form_data: {
      age: values.applicant.dob ? Math.floor((Date.now() - new Date(values.applicant.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 30,
      drivingExperienceYears: values.driving.drivingExperienceYears,
      minorViolations: values.driving.violations.filter((v) => v.type !== "dui").length,
      duiCount: values.driving.violations.filter((v) => v.type === "dui").length,
      duiInLast2Years: values.driving.violations.some((v) => v.type === "dui"),
      claimsCount: values.driving.accidents.length,
      atFaultClaimsCount: values.driving.accidents.filter((a) => a.atFault).length,
      vehicleAgeYears: Math.max(0, 2026 - values.vehicle.year),
      hasModifications: values.vehicle.hasModifications,
      isEv: values.vehicle.fuelType === "electric",
      isSportsCar: values.vehicle.vehicleType === "suv",
      annualIncome: incomeFromBand(values.applicant.annualIncomeBand),
      idv: values.coverage.idv,
      ncbYears: values.driving.ncbYears,
      selectedAddons: values.coverage.addons,
    },
  });

  const persistDraft = async (): Promise<string | null> => {
    const applicantEmail = values.applicant.email.trim();
    if (applicantEmail) {
      const validationResult = await validateApplicantEmail(applicantEmail, draftId);
      if (!validationResult.success) {
        form.setError("applicant.email", { type: "server", message: validationResult.error });
        return null;
      }
      form.clearErrors("applicant.email");
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile) return null;

    const payload = buildDraftPayload();

    if (!draftId) {
      const { data: inserted } = await supabase
        .from("applications")
        .insert({
          ...payload,
          organization_id: profile.organization_id,
          submitted_by: user.id,
          status: "draft",
          product_type: "auto",
        })
        .select("id")
        .single();

      if (inserted?.id) {
        setDraftId(inserted.id);
        return inserted.id;
      }
      return null;
    }

    const { error } = await supabase.from("applications").update(payload).eq("id", draftId);
    if (error) return null;
    return draftId;
  };

  useEffect(() => {
    const loadDraft = async (): Promise<void> => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      if (draftIdFromQuery) {
        const { data: selectedDraft } = await supabase
          .from("applications")
          .select("id,application_number,raw_form_data,applicant_name,applicant_email,applicant_phone,applicant_dob,applicant_address,vehicle_details,driving_history,coverage_selection,status")
          .eq("id", draftIdFromQuery)
          .eq("submitted_by", user.id)
          .eq("status", "draft")
          .maybeSingle();

        if (selectedDraft) {
          form.reset(mapDraftToForm(selectedDraft as Record<string, unknown>));
          setDraftId(selectedDraft.id);
          setDraftBanner(null);
          return;
        }
      }

      const { data: draft } = await supabase
        .from("applications")
        .select("id,application_number,raw_form_data,applicant_name,applicant_email,applicant_phone,applicant_dob,applicant_address,vehicle_details,driving_history,coverage_selection,status")
        .eq("submitted_by", user.id)
        .eq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (draft) {
        setDraftId(draft.id);
        form.reset(mapDraftToForm(draft as Record<string, unknown>));
        setDraftBanner({ id: draft.id, number: draft.application_number });
      }
    };

    void loadDraft();
  }, [draftIdFromQuery, form]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void (async () => {
        setSaving(true);
        await persistDraft();
        setSaving(false);
      })();
    }, 30000);

    return () => clearTimeout(timer);
  }, [draftId, values]);

  const maskedPan = (pan: string): string => {
    if (pan.length < 4) return pan;
    return `••••••${pan.slice(-4).toUpperCase()}`;
  };

  const handleUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    key: keyof ApplicationFormValues["documents"],
    docType: "proposal_form" | "id_proof" | "vehicle_inspection" | "claim_history" | "other",
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
      setDocErrors((prev) => ({ ...prev, [key]: "Only PDF/JPG/PNG allowed" }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setDocErrors((prev) => ({ ...prev, [key]: "Max file size is 5MB" }));
      return;
    }

    setDocErrors((prev) => ({ ...prev, [key]: "" }));
    let activeDraftId = draftId;
    if (!activeDraftId) {
      setSaving(true);
      const createdDraftId = await persistDraft();
      setSaving(false);
      if (!createdDraftId) {
        setDocErrors((prev) => ({ ...prev, [key]: "Could not create draft. Please fill required fields and try again." }));
        return;
      }
      activeDraftId = createdDraftId;
    }

    const uploadUrl = await createDocumentSignedUploadUrl({
      applicationId: activeDraftId,
      documentType: docType,
      fileName: file.name,
      extensionHint: file.name.toLowerCase().split(".").pop() as "pdf" | "jpg" | "jpeg" | "png" | undefined,
    });

    if (!uploadUrl.success) {
      setDocErrors((prev) => ({ ...prev, [key]: uploadUrl.error }));
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.storage.from("documents").uploadToSignedUrl(uploadUrl.data.path, uploadUrl.data.token, file);

    if (error) {
      setDocErrors((prev) => ({ ...prev, [key]: error.message }));
      return;
    }

    form.setValue(`documents.${key}`, uploadUrl.data.path);
  };

  const validateStep = async (): Promise<boolean> => {
    if (currentStep === 1) {
      const formValid = await form.trigger("applicant");
      if (!formValid) return false;

      const applicantEmail = values.applicant.email.trim();
      if (!applicantEmail) return true;

      const validationResult = await validateApplicantEmail(applicantEmail, draftId);
      if (!validationResult.success) {
        form.setError("applicant.email", { type: "server", message: validationResult.error });
        return false;
      }

      form.clearErrors("applicant.email");
      return true;
    }
    if (currentStep === 2) return form.trigger("vehicle");
    if (currentStep === 3) return form.trigger("driving");
    if (currentStep === 4) return form.trigger("coverage");
    if (currentStep === 5) return form.trigger("documents");
    return form.trigger("review");
  };

  const nextStep = async (): Promise<void> => {
    const valid = await validateStep();
    if (!valid) return;
    setCurrentStep((prev) => Math.min(6, prev + 1));
  };

  const prevStep = (): void => setCurrentStep((prev) => Math.max(1, prev - 1));

  const handleSubmit = async (): Promise<void> => {
    setSubmitError(null);
    const reviewValid = await form.trigger("review");
    if (!reviewValid) return;

    setSubmitting(true);
    const savedDraftId = await persistDraft();
    if (!savedDraftId) {
      setSubmitting(false);
      setSubmitError("Could not save your latest changes. Please wait a few seconds and try again.");
      return;
    }

    const result = await processApplication(savedDraftId);
    setSubmitting(false);

    if (!result.success) {
      setSubmitError(normalizeSubmitError(result.error));
      return;
    }

    router.push(`/applications/${savedDraftId}?new=true`);
  };

  return (
    <div className="space-y-6">
      {draftBanner ? (
        <div className="flex items-center justify-between rounded-card border border-status-referred/40 bg-status-referred/10 p-4 text-sm">
          <p>
            You have an unfinished application. Resume it? {draftBanner.number ? `(${draftBanner.number})` : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push(`/applications/new?draft=${draftBanner.id}`)}>Resume</Button>
            <button
              type="button"
              onClick={() => {
                setDraftBanner(null);
                setDraftId(null);
                form.reset(defaultValues);
              }}
              className="text-accent"
            >
              Start Fresh
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-card border border-border bg-surface p-4">
        <div className="mb-4 grid grid-cols-6 gap-2 text-center text-xs">
          {steps.map((step, index) => {
            const idx = index + 1;
            return (
              <div key={step} className="space-y-1">
                <div className={cn(
                  "mx-auto flex h-8 w-8 items-center justify-center rounded-full border",
                  idx < currentStep && "border-accent bg-accent text-white",
                  idx === currentStep && "border-accent text-accent",
                  idx > currentStep && "border-slate-600 text-slate-500",
                )}>{idx < currentStep ? <Check className="h-4 w-4" /> : idx}</div>
                <p className="text-[11px] text-muted">{step}</p>
              </div>
            );
          })}
        </div>
        <Progress value={(currentStep / 6) * 100} />
      </div>

      <div className="relative overflow-hidden rounded-card border border-border bg-surface p-6">
        <div className="transition-transform duration-300" style={{ transform: `translateX(${(1 - currentStep) * 2}px)` }}>
          {currentStepErrors.length > 0 ? (
            <div className="mb-4 rounded-md border border-status-declined/30 bg-status-declined/10 p-3">
              <p className="text-sm font-medium text-status-declined">Please fix the following:</p>
              <ul className="mt-1 list-disc pl-5 text-xs text-status-declined">
                {currentStepErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {currentStep === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Full Name</Label><Input {...form.register("applicant.fullName")} /></div>
              <div>
                <Label>Email</Label>
                <Input type="email" {...form.register("applicant.email")} />
                <p className="mt-1 text-xs text-muted">Use the applicant&apos;s email, not the logged-in agent/admin email.</p>
                {errors.applicant?.email?.message ? <p className="mt-1 text-sm text-status-declined">{errors.applicant.email.message}</p> : null}
              </div>
              <div><Label>Phone</Label><Input {...form.register("applicant.phone")} /></div>
              <div>
                <Label>Date of Birth</Label>
                <Input type="date" {...form.register("applicant.dob")} />
              </div>
              <div>
                <Label>PAN Number</Label>
                <Input {...form.register("applicant.pan")} onBlur={() => form.setValue("applicant.pan", maskedPan(form.getValues("applicant.pan")))} />
              </div>
              <div><Label>Address Line 1</Label><Input {...form.register("applicant.addressLine1")} /></div>
              <div><Label>Address Line 2</Label><Input {...form.register("applicant.addressLine2")} /></div>
              <div><Label>City</Label><Input {...form.register("applicant.city")} /></div>
              <div>
                <Label>State</Label>
                <Select onValueChange={(v) => form.setValue("applicant.state", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES_AND_UTS.map((state) => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Pincode</Label><Input {...form.register("applicant.pincode")} /></div>
              <div>
                <Label>Occupation</Label>
                <Select onValueChange={(v) => form.setValue("applicant.occupation", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["Salaried", "Self-employed", "Business Owner", "Student", "Retired", "Other"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Annual Income</Label>
                <Select onValueChange={(v) => form.setValue("applicant.annualIncomeBand", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under3">Under ₹3L</SelectItem>
                    <SelectItem value="3-5">₹3-5L</SelectItem>
                    <SelectItem value="5-10">₹5-10L</SelectItem>
                    <SelectItem value="10-25">₹10-25L</SelectItem>
                    <SelectItem value="above25">Above ₹25L</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {["bike", "car", "suv", "commercial"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => form.setValue("vehicle.vehicleType", type as ApplicationFormValues["vehicle"]["vehicleType"])}
                    className={cn(
                      "rounded-card border p-3 text-sm capitalize",
                      values.vehicle.vehicleType === type ? "border-accent bg-accent/10 text-accent" : "border-border",
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><Label>Make</Label><Input {...form.register("vehicle.make")} /></div>
                <div><Label>Model</Label><Input {...form.register("vehicle.model")} /></div>
                <div><Label>Year</Label><Input type="number" {...form.register("vehicle.year", { valueAsNumber: true })} /></div>
                <div><Label>Registration</Label><Input placeholder="MH01AB1234" {...form.register("vehicle.registrationNumber")} /></div>
                <div><Label>VIN</Label><Input {...form.register("vehicle.vin")} /></div>
                <div>
                  <Label>Fuel Type</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {["petrol", "diesel", "cng", "electric", "hybrid"].map((fuel) => (
                      <button key={fuel} type="button" onClick={() => form.setValue("vehicle.fuelType", fuel as ApplicationFormValues["vehicle"]["fuelType"])} className={cn("rounded-full border px-3 py-1 text-xs", values.vehicle.fuelType === fuel ? "border-accent bg-accent/10 text-accent" : "border-border")}>{fuel}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Usage</Label>
                  <div className="mt-1 flex gap-2">
                    {["personal", "commercial"].map((usage) => (
                      <button key={usage} type="button" onClick={() => form.setValue("vehicle.usage", usage as ApplicationFormValues["vehicle"]["usage"])} className={cn("rounded-full border px-3 py-1 text-xs capitalize", values.vehicle.usage === usage ? "border-accent bg-accent/10 text-accent" : "border-border")}>{usage}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Parking</Label>
                  <div className="mt-1 flex gap-2">
                    {["garage", "open", "street"].map((parking) => (
                      <button key={parking} type="button" onClick={() => form.setValue("vehicle.parking", parking as ApplicationFormValues["vehicle"]["parking"])} className={cn("rounded-full border px-3 py-1 text-xs capitalize", values.vehicle.parking === parking ? "border-accent bg-accent/10 text-accent" : "border-border")}>{parking}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={values.vehicle.hasModifications} onCheckedChange={(v) => form.setValue("vehicle.hasModifications", v)} />
                  <Label>Modifications</Label>
                </div>
              </div>
              {values.vehicle.hasModifications ? (
                <div className="rounded-card border border-status-referred/40 bg-status-referred/10 p-3 text-sm text-status-referred">
                  <AlertTriangle className="mr-2 inline h-4 w-4" /> Modified vehicles will be referred for manual review.
                </div>
              ) : null}
            </div>
          ) : null}

          {currentStep === 3 ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div><Label>Experience Years</Label><Input type="number" {...form.register("driving.drivingExperienceYears", { valueAsNumber: true })} /></div>
                <div><Label>License Number</Label><Input {...form.register("driving.licenseNumber")} /></div>
                <div>
                  <Label>License Type</Label>
                  <Select onValueChange={(v) => form.setValue("driving.licenseType", v as ApplicationFormValues["driving"]["licenseType"])}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lmv">LMV</SelectItem>
                      <SelectItem value="mcwg">MCWG</SelectItem>
                      <SelectItem value="hmv">HMV</SelectItem>
                      <SelectItem value="mcwog">MCWOG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Accidents</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => appendAccident({ date: "", description: "", atFault: false })}>
                    <Plus className="mr-1 h-4 w-4" /> Add Accident
                  </Button>
                </div>
                {accidentFields.map((field, index) => (
                  <div key={field.id} className="rounded-card border border-border p-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto_auto]">
                      <Input type="date" {...form.register(`driving.accidents.${index}.date`)} />
                      <Textarea {...form.register(`driving.accidents.${index}.description`)} placeholder="Description" />
                      <label className="flex items-center gap-2 text-xs"><Checkbox checked={values.driving.accidents[index]?.atFault} onCheckedChange={(v) => form.setValue(`driving.accidents.${index}.atFault`, v === true)} />At fault</label>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAccident(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Violations</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => appendViolation({ date: "", type: "speeding" })}>
                    <Plus className="mr-1 h-4 w-4" /> Add Violation
                  </Button>
                </div>
                {violationFields.map((field, index) => (
                  <div key={field.id} className="rounded-card border border-border p-3">
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <Input type="date" {...form.register(`driving.violations.${index}.date`)} />
                      <Select onValueChange={(v) => form.setValue(`driving.violations.${index}.type`, v as ApplicationFormValues["driving"]["violations"][number]["type"])}>
                        <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="speeding">Speeding</SelectItem>
                          <SelectItem value="signal_jump">Signal Jump</SelectItem>
                          <SelectItem value="wrong_lane">Wrong Lane</SelectItem>
                          <SelectItem value="dui">DUI</SelectItem>
                          <SelectItem value="reckless">Reckless</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeViolation(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={values.driving.previousInsurance} onCheckedChange={(v) => form.setValue("driving.previousInsurance", v)} />
                <Label>Previous Insurance</Label>
              </div>
              {values.driving.previousInsurance ? (
                <div className="grid gap-4 md:grid-cols-3">
                  <div><Label>Previous Insurer</Label><Input {...form.register("driving.previousInsurer")} /></div>
                  <div><Label>Years Insured</Label><Input type="number" {...form.register("driving.yearsInsured", { valueAsNumber: true })} /></div>
                  <div><Label>NCB Years</Label><Input type="number" min={0} max={5} {...form.register("driving.ncbYears", { valueAsNumber: true })} /></div>
                </div>
              ) : null}
            </div>
          ) : null}

          {currentStep === 4 ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { id: "third_party", title: "Third Party", desc: "Legally required minimum" },
                  { id: "third_party_fire_theft", title: "Third Party + Fire & Theft", desc: "Popular Choice" },
                  { id: "comprehensive", title: "Comprehensive", desc: "Recommended" },
                ].map((coverage) => (
                  <button
                    key={coverage.id}
                    type="button"
                    className={cn("rounded-card border p-4 text-left", values.coverage.coverageType === coverage.id ? "border-accent bg-accent/10" : "border-border")}
                    onClick={() => form.setValue("coverage.coverageType", coverage.id as ApplicationFormValues["coverage"]["coverageType"])}
                  >
                    <p className="font-semibold">{coverage.title}</p>
                    <p className="text-xs text-muted">{coverage.desc}</p>
                  </button>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {addonOptions.map((addon) => {
                  const selected = values.coverage.addons.includes(addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => {
                        const next = selected
                          ? values.coverage.addons.filter((item) => item !== addon.id)
                          : [...values.coverage.addons, addon.id];
                        form.setValue("coverage.addons", next);
                      }}
                      className={cn("rounded-card border p-3 text-left", selected ? "border-accent bg-accent/10" : "border-border")}
                    >
                      <p className="font-medium">{addon.label}</p>
                      <p className="text-xs text-muted">+₹{addon.price.toLocaleString("en-IN")}</p>
                    </button>
                  );
                })}
              </div>

              <div>
                <Label>IDV (₹{values.coverage.idv.toLocaleString("en-IN")})</Label>
                <input
                  type="range"
                  min={50000}
                  max={3000000}
                  step={10000}
                  value={values.coverage.idv}
                  onChange={(event) => form.setValue("coverage.idv", Number(event.target.value))}
                  className="mt-2 w-full"
                />
              </div>

              <div className="rounded-card border border-accent/40 bg-accent/10 p-4">
                <p className="text-sm text-muted">Estimated Premium</p>
                <p className="font-heading text-3xl text-accent">₹{estimatedPremium.finalPremium.toLocaleString("en-IN")}/year</p>
                <p className="mt-2 text-xs text-muted">
                  Base + Loading - NCB + Addons = Total
                </p>
              </div>
            </div>
          ) : null}

          {currentStep === 5 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { key: "idProof", label: "ID Proof", required: true, type: "id_proof" },
                { key: "vehicleRc", label: "Vehicle Registration Certificate", required: true, type: "vehicle_inspection" },
                { key: "previousPolicy", label: "Previous Insurance Policy", required: false, type: "claim_history" },
              ].map((doc) => (
                <label key={doc.key} className="cursor-pointer rounded-card border border-dashed border-border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium">{doc.label}</p>
                    <span className={cn("rounded px-2 py-0.5 text-xs", doc.required ? "bg-status-declined/20 text-status-declined" : "bg-slate-500/20 text-slate-300")}>
                      {doc.required ? "Required" : "Optional"}
                    </span>
                  </div>
                  <CloudUpload className="mb-2 h-5 w-5 text-muted" />
                  <p className="text-xs text-muted">Drag drop or click to browse</p>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) =>
                      void handleUpload(
                        event,
                        doc.key as keyof ApplicationFormValues["documents"],
                        doc.type as "proposal_form" | "id_proof" | "vehicle_inspection" | "claim_history" | "other",
                      )
                    }
                  />
                  <p className="mt-2 text-xs text-status-approved">{values.documents[doc.key as keyof ApplicationFormValues["documents"]] ? "Uploaded" : ""}</p>
                  <p className="mt-1 text-xs text-status-declined">{docErrors[doc.key] ?? ""}</p>
                </label>
              ))}
            </div>
          ) : null}

          {currentStep === 6 ? (
            <div className="space-y-4">
              <Accordion type="multiple" defaultValue={["applicant"]}>
                {[
                  { id: "applicant", label: "Applicant", content: JSON.stringify(values.applicant, null, 2) },
                  { id: "vehicle", label: "Vehicle", content: JSON.stringify(values.vehicle, null, 2) },
                  { id: "driving", label: "Driving", content: JSON.stringify(values.driving, null, 2) },
                  { id: "coverage", label: "Coverage", content: JSON.stringify(values.coverage, null, 2) },
                  { id: "documents", label: "Documents", content: JSON.stringify(values.documents, null, 2) },
                ].map((section, index) => (
                  <AccordionItem key={section.id} value={section.id}>
                    <AccordionTrigger className="font-medium">{section.label}</AccordionTrigger>
                    <AccordionContent>
                      <pre className="overflow-auto rounded border border-border p-3 text-xs">{section.content}</pre>
                      <Button variant="ghost" size="sm" onClick={() => setCurrentStep(index + 1)}>Edit</Button>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              <div className="rounded-card border border-accent/40 bg-accent/10 p-4">
                <p className="text-sm text-muted">Total Estimated Premium</p>
                <p className="font-heading text-4xl text-accent">₹{estimatedPremium.finalPremium.toLocaleString("en-IN")}</p>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={values.review.acceptTerms} onCheckedChange={(value) => form.setValue("review.acceptTerms", value === true)} />
                I accept terms & conditions
              </label>
              {errors.review?.acceptTerms?.message ? (
                <p className="text-sm text-status-declined">{errors.review.acceptTerms.message}</p>
              ) : null}

              <Button className="w-full bg-accent text-white" onClick={() => void handleSubmit()} disabled={submitting}>
                {submitting ? "Analyzing your risk profile..." : "Submit Application"}
              </Button>
              {submitError ? (
                <p className="text-center text-sm text-status-declined">{submitError}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted">
          {saving ? "Saving draft..." : <><CheckCircle2 className="h-4 w-4 text-status-approved" /> Draft saved</>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1}>Back</Button>
          {currentStep < 6 ? (
            <Button className="bg-accent text-white" onClick={() => void nextStep()}>Next <ChevronRight className="ml-1 h-4 w-4" /></Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

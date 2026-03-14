"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { registerUser } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDIAN_STATES_AND_UTS } from "@/lib/constants/india";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const schema = z
  .object({
    organizationName: z.string().min(2, "Organization name is required"),
    licenseNumber: z.string().min(2, "License number is required"),
    state: z.string().min(2, "State is required"),
    contactPhone: z.string().min(10, "Phone number must be at least 10 digits"),
    fullName: z.string().min(2, "Full name is required"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

const steps = ["Organization", "Account", "Done"];

const passwordStrength = (value: string): "weak" | "medium" | "strong" => {
  const score = [/.{8,}/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((regex) => regex.test(value)).length;
  if (score <= 2) return "weak";
  if (score === 3) return "medium";
  return "strong";
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const pwd = watch("password") ?? "";
  const strength = passwordStrength(pwd);

  const goNext = async (): Promise<void> => {
    const valid = await trigger(["organizationName", "licenseNumber", "state", "contactPhone"]);
    if (!valid) return;
    setOrgName(watch("organizationName") ?? "");
    setStep(2);
  };

  const onSubmit = async (values: FormValues): Promise<void> => {
    setLoading(true);
    setError(null);

    const result = await registerUser({
      organizationName: values.organizationName,
      licenseNumber: values.licenseNumber,
      state: values.state,
      fullName: values.fullName,
      email: values.email,
      phone: values.contactPhone,
      password: values.password,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setCreatedCreds({ email: values.email, password: values.password });
    setStep(3);
  };

  const goToDashboard = async (): Promise<void> => {
    if (!createdCreds) {
      router.replace("/login");
      return;
    }

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: createdCreds.email,
      password: createdCreds.password,
    });

    if (signInError) {
      setError(signInError.message);
      router.replace("/login");
      return;
    }

    router.replace("/dashboard");
    router.refresh();
    window.location.href = "/dashboard";
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg rounded-card border border-border bg-surface p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((label, index) => {
              const current = index + 1;
              const completed = current < step;
              const active = current === step;
              return (
                <div key={label} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border text-xs",
                        completed && "border-accent bg-accent text-white",
                        active && "border-accent bg-white text-accent",
                        !completed && !active && "border-slate-500 bg-transparent text-slate-400",
                      )}
                    >
                      {completed ? <Check className="h-4 w-4" /> : current}
                    </div>
                    <span className="mt-1 text-xs text-muted">{label}</span>
                  </div>
                  {index < steps.length - 1 ? <div className="mx-2 h-px flex-1 bg-border" /> : null}
                </div>
              );
            })}
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <h1 className="font-heading text-2xl">Organization Details</h1>
            <div>
              <Label>Organization name</Label>
              <Input {...register("organizationName")} />
              {errors.organizationName ? <p className="mt-1 text-xs text-status-declined">{errors.organizationName.message}</p> : null}
            </div>
            <div>
              <Label>License number</Label>
              <Input {...register("licenseNumber")} />
              {errors.licenseNumber ? <p className="mt-1 text-xs text-status-declined">{errors.licenseNumber.message}</p> : null}
            </div>
            <div>
              <Label>State</Label>
              <Select onValueChange={(value) => setValue("state", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES_AND_UTS.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state ? <p className="mt-1 text-xs text-status-declined">{errors.state.message}</p> : null}
            </div>
            <div>
              <Label>Contact phone</Label>
              <Input {...register("contactPhone")} />
              {errors.contactPhone ? <p className="mt-1 text-xs text-status-declined">{errors.contactPhone.message}</p> : null}
            </div>
            <Button className="w-full bg-accent text-white" onClick={() => void goNext()}>
              Next
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <h1 className="font-heading text-2xl">Create your account</h1>
            <div>
              <Label>Full name</Label>
              <Input {...register("fullName")} />
              {errors.fullName ? <p className="mt-1 text-xs text-status-declined">{errors.fullName.message}</p> : null}
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
              {errors.email ? <p className="mt-1 text-xs text-status-declined">{errors.email.message}</p> : null}
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" {...register("password")} />
              <div className="mt-2 h-1 w-full rounded-full bg-border">
                <div
                  className={cn(
                    "h-1 rounded-full transition-all",
                    strength === "weak" && "w-1/3 bg-status-declined",
                    strength === "medium" && "w-2/3 bg-status-referred",
                    strength === "strong" && "w-full bg-status-approved",
                  )}
                />
              </div>
              {errors.password ? <p className="mt-1 text-xs text-status-declined">{errors.password.message}</p> : null}
            </div>
            <div>
              <Label>Confirm password</Label>
              <Input type="password" {...register("confirmPassword")} />
              {errors.confirmPassword ? <p className="mt-1 text-xs text-status-declined">{errors.confirmPassword.message}</p> : null}
            </div>
            {error ? <p className="text-sm text-status-declined">{error}</p> : null}
            <Button className="w-full bg-accent text-white" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create account"}
            </Button>
          </form>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent text-accent">
              <Check className="h-8 w-8" />
            </div>
            <h1 className="font-heading text-3xl">Welcome to RiskIQ!</h1>
            <p className="text-muted">{orgName}</p>
            <button
              type="button"
              onClick={() => void goToDashboard()}
              className="inline-block w-full rounded-button bg-accent px-4 py-2 text-white"
            >
              Go to Dashboard
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

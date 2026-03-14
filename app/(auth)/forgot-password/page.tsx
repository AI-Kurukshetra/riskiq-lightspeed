"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

type FormValue = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValue>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValue): Promise<void> => {
    setLoading(true);
    setSuccess(null);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/login`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSuccess("Password reset link sent. Please check your email.");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-6">
        <h1 className="font-heading text-3xl">Forgot password</h1>
        <p className="mt-1 text-sm text-muted">We will send a reset link to your email.</p>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <Label>Email</Label>
            <Input type="email" {...register("email")} />
            {errors.email ? <p className="mt-1 text-xs text-status-declined">{errors.email.message}</p> : null}
          </div>
          {success ? <p className="text-sm text-status-approved">{success}</p> : null}
          {error ? <p className="text-sm text-status-declined">{error}</p> : null}
          <Button className="w-full bg-accent text-white" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</Button>
        </form>
      </div>
    </main>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Check, Eye, EyeOff, Lock, Mail, Shield, SunMoon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  remember: z.boolean(),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { remember: false },
  });

  const onSubmit = async (values: LoginForm): Promise<void> => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
    window.location.href = "/dashboard";
  };

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#0F172A] px-10 py-12 lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-accent" />
          <p className="font-heading text-3xl text-accent">RiskIQ</p>
        </div>

        <div>
          <h1 className="font-heading text-4xl leading-tight text-white">Underwriting at the speed of intelligence</h1>
          <p className="mt-4 text-lg text-slate-300">Built for modern insurance carriers</p>
        </div>

        <div className="space-y-3 text-slate-200">
          {[
            "Instant risk scoring",
            "Automated decisions in seconds",
            "Complete audit trail",
          ].map((item) => (
            <p key={item} className="flex items-center gap-2">
              <Check className="h-4 w-4 text-accent" />
              {item}
            </p>
          ))}
        </div>

        <div className="login-glow absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-accent blur-3xl" />
      </div>

      <div className="relative flex items-center justify-center p-6">
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="absolute right-6 top-6 rounded-button border border-border p-2"
        >
          <SunMoon className="h-4 w-4" />
        </button>

        <div className="w-full max-w-md rounded-card border border-border bg-surface p-8">
          <h1 className="font-heading text-3xl">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">Sign in to your account</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <Label>Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted" />
                <Input {...register("email")} type="email" className="pl-9" placeholder="you@company.com" />
              </div>
              {errors.email ? <p className="mt-1 text-xs text-status-declined">{errors.email.message}</p> : null}
            </div>

            <div>
              <Label>Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted" />
                <Input {...register("password")} type={showPassword ? "text" : "password"} className="px-9" placeholder="••••••••" />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-3 text-muted"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password ? <p className="mt-1 text-xs text-status-declined">{errors.password.message}</p> : null}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted">
                <Checkbox
                  checked={watch("remember")}
                  onCheckedChange={(checked) => setValue("remember", checked === true)}
                />
                Remember me
              </label>
              <Link href="/forgot-password" className="text-accent hover:underline">
                Forgot password?
              </Link>
            </div>

            {error ? (
              <Alert className="border-status-declined/30 bg-status-declined/10 text-status-declined">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="submit" className="w-full bg-accent text-white hover:bg-accent/90" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>

            <div className="relative py-2 text-center text-xs text-muted">
              <span className="bg-surface px-2">or</span>
              <div className="absolute left-0 right-0 top-1/2 -z-10 h-px bg-border" />
            </div>

            <p className="text-center text-sm text-muted">
              New organization?{" "}
              <Link href="/register" className="text-accent hover:underline">
                Register here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

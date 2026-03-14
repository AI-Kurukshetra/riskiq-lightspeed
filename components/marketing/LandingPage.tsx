"use client";

import { motion } from "framer-motion";
import { ArrowRight, Bot, Moon, ShieldCheck, Sparkles, Sun, Workflow } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import type { JSX } from "react";

import { Button } from "@/components/ui/button";

const features = [
  {
    title: "Instant Risk Scoring",
    description: "Convert proposal data into weighted risk signals in seconds with a clear explanation trail.",
    icon: Bot,
  },
  {
    title: "Automated Underwriting",
    description: "Apply your rules engine, route referrals, and keep manual review focused on the right cases.",
    icon: ShieldCheck,
  },
  {
    title: "Real-time Decision Engine",
    description: "Move from submission to quote with live status updates, auditability, and operator visibility.",
    icon: Workflow,
  },
];

const stats = [
  { label: "Decision velocity", value: "< 10s" },
  { label: "Workflow visibility", value: "100%" },
  { label: "Audit readiness", value: "Built-in" },
];

export function LandingPage(): JSX.Element {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="absolute inset-0 overflow-hidden">
        <div className="soft-gradient absolute inset-0" />
        <motion.div
          className="surface-glow absolute -left-24 top-20 h-80 w-80 rounded-full bg-accent/15 blur-3xl"
          animate={{ x: [0, 40, -10, 0], y: [0, 30, -20, 0], opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-status-processing/10 blur-3xl"
          animate={{ x: [0, -30, 10, 0], y: [0, -30, 20, 0], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-screen-xl flex-col px-6 py-6">
        <header className="flex items-center justify-between rounded-2xl border border-border bg-surface/80 px-5 py-4 shadow-card backdrop-blur">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-heading text-xl text-foreground">RiskIQ</p>
              <p className="text-xs text-muted">AI-first underwriting workspace</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background transition hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface"
              aria-label="Toggle theme"
            >
              <Sun className="hidden h-4 w-4 dark:block" />
              <Moon className="h-4 w-4 dark:hidden" />
            </button>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Sign Up</Link>
            </Button>
          </div>
        </header>

        <main className="flex flex-1 items-center py-12">
          <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                Underwriting, redesigned
              </div>

              <div className="space-y-5">
                <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
                  AI-powered underwriting platform for modern insurers
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted sm:text-lg">
                  RiskIQ helps carriers move from application intake to decision, quote, and audit trail with a clean workflow that feels fast,
                  explainable, and production-ready.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="group">
                  <Link href="/register">
                    Get Started
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">Login</Link>
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-border bg-surface/80 p-5 shadow-card backdrop-blur">
                    <p className="text-2xl font-semibold tracking-tight text-foreground">{stat.value}</p>
                    <p className="mt-1 text-sm text-muted">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="rounded-[28px] border border-border bg-surface/90 p-6 shadow-card backdrop-blur">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div>
                    <p className="text-lg font-medium">Live workflow visibility</p>
                    <p className="text-sm text-muted">From submission to quote without losing the trail.</p>
                  </div>
                  <span className="rounded-full bg-status-approved/10 px-3 py-1 text-xs font-medium text-status-approved">Operational</span>
                </div>

                <div className="mt-5 space-y-4">
                  {[
                    { stage: "Application received", note: "Applicant profile normalized and validated", tone: "bg-status-processing" },
                    { stage: "Risk score computed", note: "Six weighted factors with explanation output", tone: "bg-accent" },
                    { stage: "Decision generated", note: "Quote ready or referred to underwriting", tone: "bg-status-approved" },
                  ].map((step, index) => (
                    <div key={step.stage} className="flex gap-4 rounded-2xl border border-border bg-background/70 p-4">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${step.tone}`}>{index + 1}</div>
                        {index < 2 ? <div className="mt-2 h-full w-px bg-border" /> : null}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{step.stage}</p>
                        <p className="text-sm text-muted">{step.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </main>

        <section className="space-y-6 py-10">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">Platform highlights</p>
            <h2 className="text-3xl font-semibold tracking-tight">Everything underwriters need in one clean operating layer</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;

              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.35 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="rounded-2xl border border-border bg-surface p-6 shadow-card"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-medium">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="py-8">
          <div className="rounded-[28px] border border-border bg-surface p-8 shadow-card">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">Ready to go live</p>
                <h2 className="text-3xl font-semibold tracking-tight">Start underwriting smarter today</h2>
                <p className="text-sm text-muted">Keep the backend you already trust and give your operators a front-end that feels investor-demo ready.</p>
              </div>
              <Button asChild size="lg">
                <Link href="/register">Create your workspace</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

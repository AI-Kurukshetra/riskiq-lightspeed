"use server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/types";

const registerInputSchema = z.object({
  organizationName: z.string().min(2),
  licenseNumber: z.string().min(2),
  state: z.string().min(2),
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional(),
  password: z.string().min(8),
});

export type RegisterInput = z.infer<typeof registerInputSchema>;

export async function registerUser(data: RegisterInput): Promise<ActionResult<{ userId: string; orgId: string }>> {
  try {
    const parsed = registerInputSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const admin = createAdminClient();

    const { data: orgData, error: orgError } = await admin
      .from("organizations")
      .insert({
        name: parsed.data.organizationName,
        license_number: parsed.data.licenseNumber,
        state: parsed.data.state,
      })
      .select("id")
      .single();

    if (orgError || !orgData) {
      return { success: false, error: orgError?.message ?? "Failed to create organization" };
    }

    const { data: signUpData, error: signUpError } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.data.fullName,
        organization_id: orgData.id,
        role: "admin",
      },
    });

    if (signUpError || !signUpData.user) {
      return { success: false, error: signUpError?.message ?? "Failed to register user" };
    }

    const { error: profileError } = await admin.from("profiles").insert({
      id: signUpData.user.id,
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      role: "admin",
      organization_id: orgData.id,
      is_active: true,
    });

    if (profileError) {
      return { success: false, error: profileError.message };
    }

    return {
      success: true,
      data: {
        userId: signUpData.user.id,
        orgId: orgData.id,
      },
    };
  } catch (error: unknown) {
    console.error("registerUser error", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to register user",
    };
  }
}

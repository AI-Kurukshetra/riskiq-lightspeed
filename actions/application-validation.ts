"use server";

import { z } from "zod";

import { validateApplicantEmailRules } from "@/lib/applications/applicant-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

const validateApplicantEmailSchema = z.object({
  applicantEmail: z.string().email(),
  currentApplicationId: z.string().uuid().optional(),
});

export const validateApplicantEmail = async (
  applicantEmail: string,
  currentApplicationId?: string | null,
): Promise<ActionResult<void>> => {
  try {
    const parsed = validateApplicantEmailSchema.safeParse({
      applicantEmail,
      currentApplicationId: currentApplicationId ?? undefined,
    });

    if (!parsed.success) {
      return { success: false, error: "Enter a valid applicant email." };
    }

    const supabase = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: "Unauthorized" };
    }

    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Profile not found." };
    }

    const validationError = await validateApplicantEmailRules({
      admin,
      organizationId: profile.organization_id,
      applicantEmail: parsed.data.applicantEmail,
      currentUserEmail: user.email,
      currentApplicationId: parsed.data.currentApplicationId,
    });

    if (validationError) {
      return { success: false, error: validationError };
    }

    return { success: true, data: undefined };
  } catch (error: unknown) {
    console.error("validateApplicantEmail error", error);
    return { success: false, error: "Failed to validate applicant email." };
  }
};


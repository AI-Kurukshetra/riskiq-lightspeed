"use server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

const requestUploadSchema = z.object({
  applicationId: z.string().uuid(),
  documentType: z.enum(["proposal_form", "id_proof", "vehicle_inspection", "claim_history", "other"]),
  fileName: z.string().min(1),
  extensionHint: z.enum(["pdf", "jpg", "jpeg", "png"]).optional(),
});

export interface UploadUrlResult {
  path: string;
  token: string;
}

export async function createDocumentSignedUploadUrl(input: z.infer<typeof requestUploadSchema>): Promise<ActionResult<UploadUrlResult>> {
  try {
    const parsed = requestUploadSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.message };
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: "Profile not found" };
    }

    const { data: appRow, error: appError } = await supabase
      .from("applications")
      .select("id,organization_id")
      .eq("id", parsed.data.applicationId)
      .single();

    if (appError || !appRow) {
      return { success: false, error: "Application not found" };
    }

    if (appRow.organization_id !== profile.organization_id) {
      return { success: false, error: "Forbidden" };
    }

    const cleanName = parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const suffix = parsed.data.extensionHint ? `.${parsed.data.extensionHint}` : "";
    const path = `applications/${parsed.data.applicationId}/${parsed.data.documentType}/${Date.now()}_${cleanName}${suffix}`;

    const admin = createAdminClient();
    const { data, error } = await admin.storage.from("documents").createSignedUploadUrl(path);

    if (error || !data) {
      return { success: false, error: error?.message ?? "Failed to create upload URL" };
    }

    return {
      success: true,
      data: {
        path: data.path,
        token: data.token,
      },
    };
  } catch (error: unknown) {
    console.error("createDocumentSignedUploadUrl error", error);
    return { success: false, error: "Failed to prepare upload" };
  }
}

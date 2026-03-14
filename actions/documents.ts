"use server";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

const schema = z.object({
  applicationId: z.string().uuid(),
  documentType: z.enum(["proposal_form", "id_proof", "vehicle_inspection", "claim_history", "other"]),
  fileName: z.string().min(1),
  fileUrl: z.string().min(1),
  fileSizeBytes: z.number().int().nonnegative().nullable(),
});

export async function addDocumentRecord(input: z.infer<typeof schema>): Promise<ActionResult<void>> {
  try {
    const parsed = schema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.message };

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const admin = createAdminClient();
    const { error } = await admin.from("documents").insert({
      application_id: parsed.data.applicationId,
      document_type: parsed.data.documentType,
      file_name: parsed.data.fileName,
      file_url: parsed.data.fileUrl,
      file_size_bytes: parsed.data.fileSizeBytes,
      uploaded_by: user.id,
    });

    if (error) return { success: false, error: error.message };

    return { success: true, data: undefined };
  } catch (error: unknown) {
    console.error("addDocumentRecord error", error);
    return { success: false, error: "Failed to add document" };
  }
}

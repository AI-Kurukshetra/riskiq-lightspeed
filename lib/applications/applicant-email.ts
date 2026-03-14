import type { SupabaseClient } from "@supabase/supabase-js";

type ValidateApplicantEmailParams = {
  admin: SupabaseClient;
  organizationId: string;
  applicantEmail: string;
  currentUserEmail: string | null | undefined;
  currentApplicationId?: string | null;
};

const normalizeEmail = (value: string | null | undefined): string => value?.trim().toLowerCase() ?? "";

export const validateApplicantEmailRules = async ({
  admin,
  organizationId,
  applicantEmail,
  currentUserEmail,
  currentApplicationId,
}: ValidateApplicantEmailParams): Promise<string | null> => {
  const normalizedApplicantEmail = normalizeEmail(applicantEmail);
  const normalizedUserEmail = normalizeEmail(currentUserEmail);

  if (!normalizedApplicantEmail) {
    return "Applicant email is required.";
  }

  if (normalizedApplicantEmail === normalizedUserEmail) {
    return "Applicant email must be different from your login email.";
  }

  let query = admin
    .from("applications")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("applicant_email", normalizedApplicantEmail)
    .limit(1);

  if (currentApplicationId) {
    query = query.neq("id", currentApplicationId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return "Could not validate applicant email right now.";
  }

  if (data?.id) {
    return "An application already exists for this applicant email. Please use a different email.";
  }

  return null;
};


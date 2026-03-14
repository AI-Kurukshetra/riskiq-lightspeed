import { renderToBuffer, Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { verifyQuotePdfToken } from "@/lib/quotes/public-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontSize: 11,
    color: "#0f172a",
  },
  heading: {
    fontSize: 20,
    marginBottom: 10,
  },
  sub: {
    fontSize: 11,
    color: "#334155",
    marginBottom: 2,
  },
  section: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  row: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    color: "#475569",
  },
  value: {
    fontWeight: 700,
  },
});

export async function GET(_request: NextRequest, context: { params: Promise<unknown> }) {
  try {
    const { id } = (await context.params) as { id: string };
    const token = _request.nextUrl.searchParams.get("token");

    const admin = createAdminClient();

    const { data: quote } = await admin
      .from("quotes")
      .select("id,application_id,quote_number,status,coverage_type,idv,base_premium,risk_loading,ncb_discount,addon_costs,final_premium,valid_until,created_at")
      .eq("id", id)
      .single();

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const { data: application } = await admin
      .from("applications")
      .select("id,organization_id,application_number,applicant_name,applicant_email,applicant_phone")
      .eq("id", quote.application_id)
      .single();

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const tokenIsValid = Boolean(
      token &&
      application.applicant_email &&
      verifyQuotePdfToken(quote.id, application.applicant_email, token),
    );

    if (!tokenIsValid) {
      const supabase = await createServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: profile } = await admin.from("profiles").select("organization_id").eq("id", user.id).single();
      if (!profile || application.organization_id !== profile.organization_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const doc = (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.heading}>RiskIQ Quote</Text>
          <Text style={styles.sub}>Quote #: {quote.quote_number ?? "-"}</Text>
          <Text style={styles.sub}>Application #: {application.application_number ?? "-"}</Text>
          <Text style={styles.sub}>Generated: {new Date(quote.created_at).toLocaleDateString("en-IN")}</Text>

          <View style={styles.section}>
            <Text style={styles.sub}>Applicant</Text>
            <Text>{application.applicant_name ?? "-"}</Text>
            <Text>{application.applicant_email ?? "-"}</Text>
            <Text>{application.applicant_phone ?? "-"}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sub}>Premium Breakdown</Text>
            <View style={styles.row}><Text style={styles.label}>Coverage</Text><Text style={styles.value}>{quote.coverage_type}</Text></View>
            <View style={styles.row}><Text style={styles.label}>IDV</Text><Text style={styles.value}>Rs {Number(quote.idv).toLocaleString("en-IN")}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Base Premium</Text><Text style={styles.value}>Rs {Number(quote.base_premium).toLocaleString("en-IN")}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Risk Loading</Text><Text style={styles.value}>Rs {Number(quote.risk_loading).toLocaleString("en-IN")}</Text></View>
            <View style={styles.row}><Text style={styles.label}>NCB Discount</Text><Text style={styles.value}>Rs {Number(quote.ncb_discount).toLocaleString("en-IN")}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Addon Costs</Text><Text style={styles.value}>Rs {Number(quote.addon_costs).toLocaleString("en-IN")}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Final Premium</Text><Text style={styles.value}>Rs {Number(quote.final_premium).toLocaleString("en-IN")}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Status</Text><Text style={styles.value}>{quote.status}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Valid Until</Text><Text style={styles.value}>{quote.valid_until ? new Date(quote.valid_until).toLocaleDateString("en-IN") : "-"}</Text></View>
          </View>
        </Page>
      </Document>
    );

    const pdfBuffer = await renderToBuffer(doc);
    const pdfBytes = new Uint8Array(pdfBuffer);

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=\"${quote.quote_number ?? "quote"}.pdf\"`,
      },
    });
  } catch (error: unknown) {
    console.error("quote pdf error", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}

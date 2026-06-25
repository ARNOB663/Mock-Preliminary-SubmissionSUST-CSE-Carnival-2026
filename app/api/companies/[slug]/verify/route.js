import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Company from "@/lib/models/Company";
import User from "@/lib/models/User";
import { withAuth, ok, parseJson, badRequest, notFound } from "@/lib/api";
import { notify } from "@/lib/notifications";

const VerifySchema = z.object({
  verified: z.boolean(),
  docs: z.array(z.string().url()).default([]),
});

/**
 * POST /api/companies/[slug]/verify
 * Admin-only. Approves or rejects a company's verification.
 * Sends notification + email to the company owner.
 */
export const POST = withAuth(
  async (req, { session, params }) => {
    await connectDB();
    const company = await Company.findOne({ slug: params.slug });
    if (!company) return notFound("Company not found.");

    const parsed = await parseJson(req);
    if (!parsed.ok) return parsed.response;
    const result = VerifySchema.safeParse(parsed.data);
    if (!result.success) {
      return badRequest("Invalid data.", result.error.issues.map((i) => i.message));
    }

    const { verified, docs } = result.data;
    company.verified = verified;
    if (docs.length) company.verificationDocs = docs;
    await company.save();

    const owner = await User.findById(company.ownerId).select("email name").lean();
    if (owner) {
      await notify({
        userId: owner._id,
        type: "verification_update",
        title: verified ? "Company verified" : "Company verification rejected",
        body: verified
          ? `${company.name} is now verified. Your future jobs will publish faster.`
          : `${company.name} verification was rejected. Please resubmit with correct documents.`,
        link: "/dashboard/company",
        email: owner.email,
        emailSubject: verified
          ? `${company.name} is verified on TechHire`
          : `${company.name} verification needs changes`,
        emailHtml: `<p>Hi ${owner.name || ""},</p>
          <p>${verified ? "Your company is now verified." : "Please update your verification documents and resubmit."}</p>
          <p>— TechHire</p>`,
      });
    }

    return ok({ verified });
  },
  { role: "admin" }
);
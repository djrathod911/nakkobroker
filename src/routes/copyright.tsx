import { createFileRoute, Link } from "@tanstack/react-router";
import { MailCheck, FileText, Scale, Clock, ShieldCheck } from "lucide-react";
import { DMCA_AGENT, dmcaAgentComplete } from "@/lib/dmca";
import { SiteFooter } from "@/components/SiteFooter";

const TITLE = "Copyright / Takedown (DMCA) — NakkoBroker";
const DESCRIPTION =
  "How to file a copyright takedown notice or counter-notice on NakkoBroker, and how to reach our designated DMCA agent.";

export const Route = createFileRoute("/copyright")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CopyrightPage,
});

function Detail({ label, value }: { label: string; value?: string | undefined }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">
        {value ? (
          value
        ) : (
          <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground">
            To be added
          </span>
        )}
      </dd>
    </div>
  );
}

function CopyrightPage() {
  const complete = dmcaAgentComplete(DMCA_AGENT);

  return (
    <div className="min-h-dvh bg-background">
      <title>{TITLE}</title>
      <meta name="description" content={DESCRIPTION} />

      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to map
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Copyright / Takedown
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          NakkoBroker respects copyright law and expects everyone who uses the platform to do the
          same. Listing photos, floor plans and descriptions belong to the people who created them.
          If your copyrighted work appears on NakkoBroker without permission, you can ask us to
          remove it using the process below — this follows the Digital Millennium Copyright Act
          (DMCA), 17 U.S.C. § 512.
        </p>

        {!complete && (
          <div
            role="status"
            className="mt-6 rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm text-muted-foreground"
          >
            <span className="font-medium text-foreground">Agent registration in progress.</span> The
            designated-agent details below are being completed — once our DMCA agent is registered,
            the exact name, postal address and email will appear here. Until then, takedown requests
            are still accepted through the notice process on this page.
          </div>
        )}

        {/* Designated agent */}
        <section aria-labelledby="agent-heading" className="mt-8">
          <h2 id="agent-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <MailCheck className="size-4.5 text-brand" aria-hidden />
            Designated DMCA agent
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Send takedown notices and counter-notices to the agent below. Requests sent anywhere else
            may be delayed.
          </p>
          <dl className="mt-3 divide-y divide-border/60 rounded-2xl border border-border bg-card/60 px-4 py-2">
            <Detail label="Agent" value={DMCA_AGENT.name || undefined} />
            <Detail label="Service provider" value={DMCA_AGENT.company} />
            <Detail label="Mailing address" value={DMCA_AGENT.address || undefined} />
            <Detail label="Phone" value={DMCA_AGENT.phone || undefined} />
            <Detail label="Email" value={DMCA_AGENT.email || undefined} />
            {DMCA_AGENT.alternateContact ? (
              <Detail label="Alternate contact" value={DMCA_AGENT.alternateContact} />
            ) : null}
          </dl>
        </section>

        {/* Filing a takedown notice */}
        <section aria-labelledby="notice-heading" className="mt-10">
          <h2 id="notice-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <FileText className="size-4.5 text-brand" aria-hidden />
            Filing a takedown notice
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            If you are a copyright owner (or authorised to act for one), send our agent a written
            notice that includes all of the following:
          </p>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              A physical or electronic signature of the copyright owner or the person authorised to
              act on their behalf.
            </li>
            <li>
              Identification of the copyrighted work you claim has been infringed — or a list of
              works if multiple works are covered by one notice.
            </li>
            <li>
              Identification of the material you want removed (for example, the NakkoBroker listing
              URL) and enough detail for us to locate it.
            </li>
            <li>Your name, mailing address, phone number and email address.</li>
            <li>
              A statement that you have a good-faith belief the use is not authorised by the
              copyright owner, its agent, or the law.
            </li>
            <li>
              A statement, made under penalty of perjury, that the information in your notice is
              accurate and that you are the copyright owner or authorised to act for them.
            </li>
          </ol>
        </section>

        {/* What happens next */}
        <section aria-labelledby="action-heading" className="mt-10">
          <h2 id="action-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Clock className="size-4.5 text-brand" aria-hidden />
            What happens after we receive a notice
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>
              We review valid notices promptly and remove or disable access to the material while we
              look into it.
            </li>
            <li>
              We forward the notice to the person who posted the material and may share it with them
              so they can respond.
            </li>
            <li>
              Users who repeatedly post material that infringes others' copyrights lose access to
              NakkoBroker.
            </li>
          </ul>
        </section>

        {/* Counter-notification */}
        <section aria-labelledby="counter-heading" className="mt-10">
          <h2 id="counter-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Scale className="size-4.5 text-brand" aria-hidden />
            Counter-notification (if your content was removed)
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            If your listing, photo or text was removed because of a takedown notice and you believe
            it was a mistake or a misidentification, you can send our agent a counter-notification
            that includes your signature, identification of the removed material and where it
            appeared, a statement under penalty of perjury that you believe the removal was a
            mistake, your name, address, phone number, and your consent to the jurisdiction of the
            court in the district of your address (or, if you are outside the United States, any
            judicial district where we operate) and your agreement to accept service of process from
            the person who filed the original notice. We may restore the material after the required
            waiting period unless the original complainant files a court action.
          </p>
        </section>

        {/* Good faith */}
        <section aria-labelledby="goodfaith-heading" className="mt-10">
          <h2 id="goodfaith-heading" className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ShieldCheck className="size-4.5 text-brand" aria-hidden />
            A note on good faith
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Knowingly filing a false takedown notice or counter-notification may make you liable for
            damages, including costs and legal fees, under 17 U.S.C. § 512(f). Please only report
            material you genuinely believe infringes your rights.
          </p>
        </section>

        <div className="mt-12 border-t border-border/60 pt-2">
          <SiteFooter showCities />
        </div>
      </main>
    </div>
  );
}

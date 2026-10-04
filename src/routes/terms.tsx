import { createFileRoute, Link } from "@tanstack/react-router";
import { UserCheck, KeyRound, Image, ShieldAlert, Gavel, RefreshCw, Ban, Scale, FileText } from "lucide-react";
import { LEGAL_CONTACT } from "@/lib/legal";
import { SiteFooter } from "@/components/SiteFooter";

const TITLE = "Terms of Service — NakkoBroker";
const DESCRIPTION =
  "The rules for using NakkoBroker: who can join, what you may list, how content is handled, and the limits of our service. Plain language, no surprises.";

export const Route = createFileRoute("/terms")({
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
  component: TermsPage,
});

function Section({
  id,
  icon,
  title,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="flex items-center gap-2 text-lg font-semibold text-foreground">
        {icon}
        {title}
      </h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function TermsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to map
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Terms of Service</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          These terms govern your use of NakkoBroker — the community-driven, zero-brokerage rental
          discovery platform for Hyderabad, Bengaluru, Chennai, Pune and Visakhapatnam. By creating an
          account or using the site, you agree to them. They are written to be read, not buried.
        </p>

        <Section id="eligibility" icon={<UserCheck className="size-4.5 text-brand" aria-hidden />} title="Who can use NakkoBroker">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              You must be 18 years or older. Our sign-in page asks you to confirm this before you can
              create an account — that age gate is part of these terms.
            </li>
            <li>
              NakkoBroker is for genuine owners listing their own flats and genuine tenants looking for
              a home. <span className="font-medium text-foreground">Brokers, agents and middlemen may not use the platform</span> to
              list, solicit or advertise.
            </li>
            <li>One account per person. Accounts are verified by a one-time code sent to your email or phone.</li>
          </ul>
        </Section>

        <Section id="account" icon={<KeyRound className="size-4.5 text-brand" aria-hidden />} title="Your account and listings">
          <ul className="list-disc space-y-2 pl-5">
            <li>Give accurate information: the flat you list must be real, available as described, and yours (or the owner's) to list.</li>
            <li>One listing per flat per city. Duplicate or bait listings (falsely low rent to attract clicks) are not allowed.</li>
            <li>
              Keep your listing honest and fresh. We ask owners to periodically confirm a listing is
              still available; listings that are not confirmed are clearly marked and eventually
              delisted, with a one-tap relist when the flat is back.
            </li>
            <li>You are responsible for the content you post and the activity on your account.</li>
          </ul>
        </Section>

        <Section id="content" icon={<Image className="size-4.5 text-brand" aria-hidden />} title="Content you post">
          <p>
            You keep ownership of the photos, floor plans and text you upload. You give NakkoBroker a
            licence to host and display them on the platform so the service works — for example,
            showing your listing photos to signed-in members. Don't post anything you have no right to
            share. If you believe someone has posted your copyrighted work without permission, use our{" "}
            <Link to="/copyright" className="text-brand underline-offset-2 hover:underline">
              Copyright / Takedown process
            </Link>
            ; we remove valid notices and act on repeat infringers.
          </p>
        </Section>

        <Section id="rules" icon={<ShieldAlert className="size-4.5 text-brand" aria-hidden />} title="Community rules">
          <ul className="list-disc space-y-2 pl-5">
            <li>No scams, harassment, discrimination, or illegal content or activity.</li>
            <li>No scraping, automated bulk access, or attempts to break authentication or access other members' data.</li>
            <li>Meetings, viewings and agreements are between owners and tenants directly — use ordinary caution, meet in person, and never pay before verifying a flat.</li>
          </ul>
        </Section>

        <Section id="money" icon={<Scale className="size-4.5 text-brand" aria-hidden />} title="Rent records and the reputation badge">
          <p>
            NakkoBroker lets tenants log rent payments and owners confirm them, and may award a
            "good renter" recognition badge for a consistent on-time record. We never handle rent money
            — payments happen directly between owner and tenant. Records and badges are informational;
            they are evidence of what both sides logged, not a guarantee, and are not a credit report
            or background check.
          </p>
        </Section>

        <Section id="disclaimer" icon={<Ban className="size-4.5 text-brand" aria-hidden />} title="No warranty">
          <p>
            NakkoBroker is provided "as is". We work hard to keep listings fresh and the map accurate,
            but we don't warrant that every listing is current, that a flat matches its description,
            or that the service will be uninterrupted. Listings are posted by community members, not
            verified by us, and any agreement you reach is solely between you and the other party.
          </p>
        </Section>

        <Section id="liability" icon={<Gavel className="size-4.5 text-brand" aria-hidden />} title="Limitation of liability">
          <p>
            To the maximum extent permitted by law, NakkoBroker is not liable for indirect or
            consequential losses — including losses from a failed deal, a dispute with another member,
            or reliance on a listing — arising from your use of the platform. Our total liability for
            any claim relating to the service is limited to ₹100 (one hundred rupees).
          </p>
        </Section>

        <Section id="termination" icon={<Ban className="size-4.5 text-brand" aria-hidden />} title="Suspension and termination">
          <p>
            We may remove listings or suspend accounts that break these terms — in particular
            brokers, bait listings, copyright infringers (see{" "}
            <Link to="/copyright" className="text-brand underline-offset-2 hover:underline">
              Copyright / Takedown
            </Link>
            ) and repeat offenders. You can stop using NakkoBroker and ask us to delete your account at
            any time (see our{" "}
            <Link to="/privacy" className="text-brand underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            ).
          </p>
        </Section>

        <Section id="changes" icon={<RefreshCw className="size-4.5 text-brand" aria-hidden />} title="Changes to these terms">
          <p>
            We may update these terms as the product evolves. Material changes will be announced on
            the site; continuing to use NakkoBroker after that means you accept the updated terms.
          </p>
        </Section>

        <Section id="law" icon={<FileText className="size-4.5 text-brand" aria-hidden />} title="Governing law and contact">
          <p>
            These terms are governed by the laws of India. Questions, complaints and legal notices can
            be sent to {LEGAL_CONTACT.company} at the contact below.
          </p>
          <dl className="mt-3 divide-y divide-border/60 rounded-2xl border border-border bg-card/60 px-4 py-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Service</dt>
              <dd className="text-sm text-foreground">{LEGAL_CONTACT.company}</dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="text-sm text-foreground">
                {LEGAL_CONTACT.email ? (
                  LEGAL_CONTACT.email
                ) : (
                  <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground">
                    To be added
                  </span>
                )}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-1.5">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Postal address</dt>
              <dd className="text-sm text-foreground">
                {LEGAL_CONTACT.address ? (
                  LEGAL_CONTACT.address
                ) : (
                  <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground">
                    To be added
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </Section>

        <p className="mt-10 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          Related:{" "}
          <Link to="/privacy" className="text-brand underline-offset-2 hover:underline">
            Privacy Policy
          </Link>{" "}
          ·{" "}
          <Link to="/copyright" className="text-brand underline-offset-2 hover:underline">
            Copyright / Takedown
          </Link>
          . These terms are provided for information and are not legal advice.
        </p>

        <div className="mt-4 border-t border-border/60 pt-2">
          <SiteFooter showCities />
        </div>
      </main>
    </div>
  );
}

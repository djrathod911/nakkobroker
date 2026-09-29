import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, Eye, UserCheck, Share2, Trash2, Lock, MailCheck, FileText } from "lucide-react";
import { LEGAL_CONTACT } from "@/lib/legal";
import { SiteFooter } from "@/components/SiteFooter";

const TITLE = "Privacy Policy — NakkoBroker";
const DESCRIPTION =
  "What NakkoBroker collects, how it is used, what we never do with it, and how to have your data deleted. Written in plain language for renters and owners.";

export const Route = createFileRoute("/privacy")({
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
  component: PrivacyPage,
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

function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to map
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Privacy Policy</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          NakkoBroker is a community-driven, zero-brokerage rental discovery platform for Hyderabad,
          Bengaluru, Chennai, Pune and Visakhapatnam. This policy explains, in plain language, what
          we collect, why, and what we will never do with it. We follow India's Digital Personal Data
          Protection Act, 2023 (DPDP) and keep the data we hold to the minimum the service needs.
        </p>

        <Section id="collect" icon={<Database className="size-4.5 text-brand" aria-hidden />} title="What we collect">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-medium text-foreground">Account details:</span> the email address
              or mobile number you sign up with. We verify it with a one-time code — no passwords.
            </li>
            <li>
              <span className="font-medium text-foreground">What you post:</span> listings you create
              (photos, rent, location pin, description), messages you send to other members, saved
              searches and alerts, viewing/tour bookings, and rent or repair records you log for your
              own tenancy.
            </li>
            <li>
              <span className="font-medium text-foreground">Basic usage data:</span> simple page-view
              counts and technical logs needed to keep the site running and fix errors. We do not use
              session replay, ad trackers, or fingerprinting.
            </li>
          </ul>
        </Section>

        <Section id="use" icon={<Eye className="size-4.5 text-brand" aria-hidden />} title="How we use it">
          <ul className="list-disc space-y-2 pl-5">
            <li>Run the service: show listings on the map, connect owners and tenants, deliver alerts you asked for.</li>
            <li>Keep NakkoBroker trustworthy: verify accounts, prevent duplicate or fake listings, and stop brokers, scams and abuse.</li>
            <li>Send service emails: sign-in codes, listing freshness reminders, and alerts you subscribed to. We do not send marketing emails.</li>
            <li>Comply with law, including copyright takedown requests.</li>
          </ul>
        </Section>

        <Section id="never" icon={<Lock className="size-4.5 text-brand" aria-hidden />} title="What we never do">
          <ul className="list-disc space-y-2 pl-5">
            <li>We never sell your personal data, to anyone, ever.</li>
            <li>We never share your contact details with other members until you choose to share them (for example by messaging an owner or replying to a tenant).</li>
            <li>We never email or advertise on behalf of brokers or agents — NakkoBroker is zero-brokerage by design.</li>
          </ul>
        </Section>

        <Section id="share" icon={<Share2 className="size-4.5 text-brand" aria-hidden />} title="Who we share with">
          <p>
            Other members see the content you publish: your listing, your display name, and anything
            you send them. Behind the scenes we rely on a small number of service providers — hosting,
            database, email delivery, and address lookup — who process data only to run NakkoBroker
            for you. We may disclose information where the law requires it, for example in response to
            a valid legal or copyright request (see our{" "}
            <Link to="/copyright" className="text-brand underline-offset-2 hover:underline">
              Copyright / Takedown page
            </Link>
            ).
          </p>
        </Section>

        <Section id="age" icon={<UserCheck className="size-4.5 text-brand" aria-hidden />} title="Age requirement">
          <p>
            NakkoBroker is for adults. At sign-up you confirm that you are 18 years or older before you
            can create an account — that is the age gate on our sign-in page. We do not knowingly
            collect data from anyone under 18; if we learn an account belongs to a minor, we will
            remove it and its data.
          </p>
        </Section>

        <Section id="retention" icon={<Trash2 className="size-4.5 text-brand" aria-hidden />} title="Retention and deletion">
          <p>
            Your listings, messages and records stay while your account is active so the service works
            for you. You can delete listings yourself at any time, and you can ask us to delete your
            account and personal data — write to the contact below and we will action it, keeping only
            what the law requires us to retain (for example records tied to a takedown or dispute).
          </p>
        </Section>

        <Section id="security" icon={<Lock className="size-4.5 text-brand" aria-hidden />} title="Security">
          <p>
            Access to member data is protected at the database level so records are only readable by
            their owners and the members a conversation involves. Photos of published listings are
            visible to signed-in members, since that is what the platform is for. We encrypt data in
            transit and follow industry-standard practices, but no service is perfectly secure —
            please don't post more personal detail in a listing than the flat needs.
          </p>
        </Section>

        <Section id="rights" icon={<MailCheck className="size-4.5 text-brand" aria-hidden />} title="Your rights and contact">
          <p>
            You can ask to access, correct or delete your personal data, or withdraw consent for a
            feature (like alerts) at any time. Write to us at the address below and we will respond
            promptly.
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

        <Section id="changes" icon={<FileText className="size-4.5 text-brand" aria-hidden />} title="Changes to this policy">
          <p>
            If we change this policy materially, we'll announce it on the site before the change takes
            effect. The policy that applies to you is the one in force when you use NakkoBroker.
          </p>
        </Section>

        <p className="mt-10 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          Related:{" "}
          <Link to="/terms" className="text-brand underline-offset-2 hover:underline">
            Terms of Service
          </Link>{" "}
          ·{" "}
          <Link to="/copyright" className="text-brand underline-offset-2 hover:underline">
            Copyright / Takedown
          </Link>
          . This page is provided for information and is not legal advice.
        </p>

        <div className="mt-4 border-t border-border/60 pt-2">
          <SiteFooter />
        </div>
      </main>
    </div>
  );
}

// Legal contact details — single source of truth for the Privacy Policy
// (/privacy) and Terms of Service (/terms) pages. DMCA agent details live
// separately in src/lib/dmca.ts.
//
// Contact details are live: email is the public legal contact address,
// address is city level only by choice — no street number is published.
// Clearing a value restores the "To be added" placeholder on the pages.

export const LEGAL_CONTACT = {
  company: "NakkoBroker",
  /** Contact email for privacy / terms questions. */
  email: "legal@nakkobroker.com",
  /** Registered or postal address, when available. */
  address: "Hyderabad, Telangana, India",
} as const;

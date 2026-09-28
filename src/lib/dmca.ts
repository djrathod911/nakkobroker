// DMCA designated agent details — single source of truth for the
// Copyright / Takedown page (/copyright).
//
// Fill these in once the agent registration with the U.S. Copyright
// Office is complete (https://dmca.copyright.gov). `registered` flips
// the page from "pending" placeholders to the final details.

export const DMCA_AGENT = {
  /** Set to true after the agent registration is accepted. */
  registered: false,
  /** Full legal name of the designated agent, e.g. "Jeevan Rathod". */
  name: "",
  /** Company the agent acts for. */
  company: "NakkoBroker",
  /** Postal address of the agent (street, city, state, PIN/ZIP, country). */
  address: "",
  /** Contact phone number with country code. */
  phone: "",
  /** Contact email for takedown notices. */
  email: "",
  /** Optional: alternate email or form URL. */
  alternateContact: "",
} as const;

export type DmcaAgent = typeof DMCA_AGENT;

export function dmcaAgentComplete(agent: DmcaAgent): boolean {
  return Boolean(agent.registered && agent.name && agent.address && agent.email);
}

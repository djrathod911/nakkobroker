import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  tenantName?: string;
  listingTitle?: string;
  listingArea?: string;
  listingCity?: string;
  tourDay?: string;
  tourTime?: string;
  ownerName?: string;
  ownerPhone?: string;
  listingUrl?: string;
}

const TourConfirmationEmail = ({
  tenantName,
  listingTitle,
  listingArea,
  listingCity,
  tourDay,
  tourTime,
  ownerName,
  ownerPhone,
  listingUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      Your visit to {listingTitle ?? "the home"} is confirmed for {tourDay ?? ""} at{" "}
      {tourTime ?? ""}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Your visit is confirmed</Heading>
        <Text style={text}>{tenantName ? `Hi ${tenantName},` : "Hi there,"}</Text>
        <Text style={text}>
          Your tour of <strong>{listingTitle ?? "the home"}</strong>
          {listingArea || listingCity
            ? ` in ${[listingArea, listingCity].filter(Boolean).join(", ")}`
            : ""}{" "}
          is booked.
        </Text>

        <Section style={card}>
          <Text style={label}>When</Text>
          <Text style={value}>
            {tourDay ?? "—"} at {tourTime ?? "—"}
          </Text>
          <Hr style={hr} />
          <Text style={label}>Owner contact</Text>
          <Text style={value}>
            {ownerName ?? "The owner"}
            {ownerPhone ? ` · ${ownerPhone}` : ""}
          </Text>
        </Section>

        <Text style={text}>
          Please arrive on time. If you can&apos;t make it, cancel the tour from your dashboard so
          the slot opens up for someone else.
        </Text>

        {listingUrl ? (
          <Button style={button} href={listingUrl}>
            View the home
          </Button>
        ) : null}

        <Text style={footer}>NakkoBroker — zero-brokerage rentals, direct from owners.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: TourConfirmationEmail,
  subject: "Your NakkoBroker visit is confirmed",
  displayName: "Tour confirmation",
  previewData: {
    tenantName: "Asha",
    listingTitle: "2BHK near Hitech City",
    listingArea: "Madhapur",
    listingCity: "Hyderabad",
    tourDay: "Sat, 18 Oct",
    tourTime: "11:00 am",
    ownerName: "Ravi",
    ownerPhone: "+91 98XXX XXXXX",
    listingUrl: "https://nakkobroker.com",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px 25px", maxWidth: "560px" };
const heading = { fontSize: "22px", color: "#0D1117", margin: "0 0 12px" };
const text = { fontSize: "14px", lineHeight: "22px", color: "#333333" };
const card = {
  backgroundColor: "#f6f8fa",
  borderRadius: "12px",
  padding: "16px 20px",
  margin: "16px 0",
};
const label = {
  fontSize: "11px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: "#888888",
  margin: "0",
};
const value = { fontSize: "16px", fontWeight: "bold" as const, color: "#0D1117", margin: "4px 0 0" };
const hr = { borderColor: "#e5e5e5", margin: "12px 0" };
const button = {
  backgroundColor: "#7c5cff",
  color: "#ffffff",
  borderRadius: "12px",
  padding: "12px 24px",
  fontSize: "14px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  display: "inline-block",
  marginTop: "8px",
};
const footer = { fontSize: "12px", color: "#999999", marginTop: "24px" };

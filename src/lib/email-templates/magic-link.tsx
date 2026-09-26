import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
  token,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head>
      <style>{darkModeCss}</style>
    </Head>
    <Preview>
      {token
        ? `Your ${siteName} sign-in code is ${token}`
        : `Your login link for ${siteName}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your sign-in code</Heading>
        <Text style={text}>
          Enter this 6-digit code on the {siteName} sign-in page. It expires
          shortly.
        </Text>
        {token ? (
          <Text style={codeBox}>{token}</Text>
        ) : null}
        <Text style={text}>
          Prefer one tap? You can also use the button below to log in directly.
        </Text>
        <Button className="dm-btn" style={button} href={confirmationUrl}>
          Log In
        </Button>
        <Text style={footer}>
          If you didn't request this code, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const codeBox = {
  fontSize: '32px',
  fontWeight: 'bold' as const,
  letterSpacing: '8px',
  textAlign: 'center' as const,
  color: '#0D1117',
  backgroundColor: '#f3f4f6',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '16px 0',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#0D1117',
  color: '#ffffff',
  fontSize: '14px',
  border: '1px solid #0D1117',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
// Rendered as a text child, which React may HTML-escape: keep this CSS free of >, &, and quotes.
const darkModeCss = `
  @media (prefers-color-scheme: dark) {
    .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  }
  [data-ogsc] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
  [data-ogsb] .dm-btn { background-color: #ffffff !important; color: #000000 !important; }
`

/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, h1, text, button, footer, SITE_NAME, SITE_URL } from './theme.ts'

interface Props {
  title?: string
  message?: string
  ctaLabel?: string
  ctaUrl?: string
  name?: string
}

const NotificationEmail = ({ title, message, ctaLabel, ctaUrl, name }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>{title || `Nova notificação — ${SITE_NAME}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{title || 'Nova notificação'}</Heading>
        {name ? <Text style={text}>Olá {name},</Text> : null}
        <Text style={text}>{message || 'Tem uma nova atualização na sua conta.'}</Text>
        {ctaUrl ? (
          <Section style={{ margin: '0 0 24px' }}>
            <Button style={button} href={ctaUrl}>{ctaLabel || 'Ver detalhes'}</Button>
          </Section>
        ) : null}
        <Text style={footer}>{SITE_NAME} — {SITE_URL}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NotificationEmail,
  subject: (data: Record<string, any>) => data?.title || 'Nova notificação',
  displayName: 'Notificação',
  previewData: {
    title: 'Consulta confirmada',
    name: 'Ana',
    message: 'A sua consulta com o Dr. Silva está marcada para amanhã às 10:00.',
    ctaLabel: 'Ver consulta',
    ctaUrl: 'https://medwalletmz.online/consultas',
  },
} satisfies TemplateEntry

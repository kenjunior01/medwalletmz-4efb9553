/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, h1, text, button, footer, SITE_NAME, SITE_URL } from './theme.ts'

interface Props {
  name?: string
  ctaUrl?: string
}

const WelcomeEmail = ({ name, ctaUrl }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Bem-vindo(a) à {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Bem-vindo(a) à {SITE_NAME}{name ? `, ${name}` : ''}!</Heading>
        <Text style={text}>
          A sua conta está pronta. Já pode fazer triagem com IA, marcar consultas online,
          encontrar farmácias e hospitais perto de si e gerir a sua carteira de saúde.
        </Text>
        <Section style={{ margin: '0 0 24px' }}>
          <Button style={button} href={ctaUrl || SITE_URL}>Abrir a minha conta</Button>
        </Section>
        <Text style={footer}>
          Precisa de ajuda? Responda a este email e a nossa equipa apoia-o.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: 'Bem-vindo(a) à MedWallet MZ',
  displayName: 'Boas-vindas',
  previewData: { name: 'Ana', ctaUrl: SITE_URL },
} satisfies TemplateEntry

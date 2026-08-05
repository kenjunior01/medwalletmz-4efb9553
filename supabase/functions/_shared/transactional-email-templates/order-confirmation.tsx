/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Row, Column, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { main, container, h1, text, button, card, label, value, footer, SITE_NAME, SITE_URL } from './theme.ts'

interface Item { name?: string; quantity?: number; price?: string }
interface Props {
  name?: string
  orderId?: string
  total?: string
  currency?: string
  items?: Item[]
  deliveryAddress?: string
  orderUrl?: string
}

const OrderConfirmationEmail = ({ name, orderId, total, currency, items, deliveryAddress, orderUrl }: Props) => (
  <Html lang="pt" dir="ltr">
    <Head />
    <Preview>Pedido {orderId ? `#${orderId}` : ''} confirmado — {SITE_NAME}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Pedido confirmado</Heading>
        <Text style={text}>
          Olá{name ? ` ${name}` : ''}, recebemos o seu pedido{orderId ? ` #${orderId}` : ''} e já está a ser preparado.
        </Text>
        <Section style={card}>
          {(items ?? []).map((item, i) => (
            <Row key={i}>
              <Column>
                <Text style={value}>
                  {item.quantity ? `${item.quantity}× ` : ''}{item.name ?? 'Item'}
                </Text>
              </Column>
              <Column align="right">
                <Text style={value}>{item.price ?? ''}</Text>
              </Column>
            </Row>
          ))}
          <Hr />
          <Row>
            <Column><Text style={label}>Total</Text></Column>
            <Column align="right">
              <Text style={value}>{total ?? '—'} {currency ?? 'MZN'}</Text>
            </Column>
          </Row>
        </Section>
        {deliveryAddress ? (
          <Section style={card}>
            <Text style={label}>Entrega</Text>
            <Text style={value}>{deliveryAddress}</Text>
          </Section>
        ) : null}
        <Section style={{ margin: '0 0 24px' }}>
          <Button style={button} href={orderUrl || `${SITE_URL}/orders`}>Acompanhar pedido</Button>
        </Section>
        <Text style={footer}>Obrigado por usar a {SITE_NAME}.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: OrderConfirmationEmail,
  subject: (data: Record<string, any>) =>
    data?.orderId ? `Pedido #${data.orderId} confirmado` : 'Pedido confirmado',
  displayName: 'Confirmação de pedido',
  previewData: {
    name: 'Ana',
    orderId: 'MW-10245',
    total: '1 250,00',
    currency: 'MZN',
    items: [
      { name: 'Paracetamol 500mg', quantity: 2, price: '250,00 MZN' },
      { name: 'Consulta online', quantity: 1, price: '1 000,00 MZN' },
    ],
    deliveryAddress: 'Av. Julius Nyerere, Maputo',
    orderUrl: 'https://medwalletmz.online/orders',
  },
} satisfies TemplateEntry

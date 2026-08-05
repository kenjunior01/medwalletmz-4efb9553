export const main = {
  backgroundColor: '#ffffff',
  fontFamily: "'Plus Jakarta Sans', 'Segoe UI', Arial, sans-serif",
}
export const container = { padding: '24px 25px', maxWidth: '560px' }
export const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(215, 65%, 12%)',
  margin: '0 0 20px',
}
export const text = {
  fontSize: '14px',
  color: 'hsl(215, 15%, 40%)',
  lineHeight: '1.6',
  margin: '0 0 18px',
}
export const strongText = { ...text, color: 'hsl(215, 65%, 12%)' }
export const button = {
  backgroundColor: 'hsl(215, 65%, 15%)',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '20px',
  padding: '14px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
export const card = {
  border: '1px solid hsl(215, 20%, 90%)',
  borderRadius: '12px',
  padding: '16px 18px',
  margin: '0 0 20px',
}
export const label = { fontSize: '12px', color: '#8a8a8a', margin: '0' }
export const value = { fontSize: '14px', color: 'hsl(215, 65%, 12%)', margin: '0 0 10px', fontWeight: 600 as const }
export const footer = { fontSize: '12px', color: '#999999', margin: '28px 0 0', lineHeight: '1.5' }
export const link = { color: 'hsl(215, 65%, 25%)', textDecoration: 'underline' }
export const SITE_URL = 'https://medwalletmz.online'
export const SITE_NAME = 'MedWallet MZ'

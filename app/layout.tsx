import type { Metadata } from 'next'
import { Bebas_Neue, DM_Mono, DM_Sans } from 'next/font/google'
import './globals.css'

const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
})
const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  variable: '--font-dm-mono',
})
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'DeedVault — Tax Deed Intelligence',
  description: 'Florida & Michigan tax deed auction search and intelligence platform.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bebas.variable} ${dmMono.variable} ${dmSans.variable} bg-vault-black text-vault-text font-sans`}>
        {children}
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Game Media Daily — Editorial OS',
  description: 'Gaming news radar, source evidence, translation and Threads studio.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>
}

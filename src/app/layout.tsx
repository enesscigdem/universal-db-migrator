import "./globals.css"
import type { ReactNode } from "react"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "DataFlow Pro - Veritabanı Dönüştürücü",
  description: "Profesyonel veritabanı geçiş ve dönüştürme platformu",
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="tr" className={inter.className}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  )
}

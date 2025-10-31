import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AutoBooker AI - Réservations 24/7. IA, zéro friction.",
  description: "Transformez vos demandes en rendez-vous confirmés, automatiquement. Assistant IA conversationnel qui comprend, négocie et réserve pendant que vous dormez. +300% de conversions garanties.",
  keywords: "réservation automatique, IA conversationnelle, assistant virtuel, prise de rendez-vous, automatisation business, chatbot réservation, WhatsApp booking, SMS automatique",
  authors: [{ name: "AutoBooker AI" }],
  creator: "AutoBooker AI",
  publisher: "AutoBooker AI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://autobooker-mvp-deploy.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "AutoBooker AI - Réservations 24/7. IA, zéro friction.",
    description: "Transformez vos demandes en rendez-vous confirmés, automatiquement. Assistant IA conversationnel qui comprend, négocie et réserve pendant que vous dormez.",
    url: 'https://autobooker-mvp-deploy.vercel.app',
    siteName: 'AutoBooker AI',
    locale: 'fr_FR',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AutoBooker AI - Assistant IA pour réservations automatiques',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "AutoBooker AI - Réservations 24/7. IA, zéro friction.",
    description: "Transformez vos demandes en rendez-vous confirmés, automatiquement. +300% de conversions garanties.",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1e293b" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.className} antialiased bg-slate-900 overflow-x-hidden`}>
        {children}
        
        {/* Schema.org structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "AutoBooker AI",
              "description": "Assistant IA conversationnel pour la prise de rendez-vous automatique 24/7",
              "url": "https://autobooker-mvp-deploy.vercel.app",
              "applicationCategory": "Business Application",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "29",
                "priceCurrency": "EUR",
                "priceValidUntil": "2025-12-31"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "ratingCount": "500"
              },
              "author": {
                "@type": "Organization",
                "name": "AutoBooker AI"
              }
            })
          }}
        />
      </body>
    </html>
  )
}
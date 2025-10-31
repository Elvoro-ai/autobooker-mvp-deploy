import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ErrorBoundary, ErrorProvider } from "@/components/error-boundary"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AutoBooker AI - Assistant de Réservation Intelligent",
  description: "Transformez vos demandes en rendez-vous confirmés automatiquement. IA conversationnelle qui comprend, négocie et réserve 24/7. +300% de conversions clients.",
  keywords: [
    "assistant IA",
    "réservation automatique", 
    "calendrier intelligent",
    "booking automation",
    "IA conversationnelle",
    "rendez-vous automatique",
    "chatbot réservation",
    "planning intelligent"
  ],
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
    type: 'website',
    locale: 'fr_FR',
    url: '/',
    title: 'AutoBooker AI - Réservations 24/7. IA, zéro friction.',
    description: 'Assistant IA qui transforme chaque demande en rendez-vous confirmé. +300% de conversions, 0 appel manqué, temps de réponse <30s.',
    siteName: 'AutoBooker AI',
    images: [{
      url: '/og-image.jpg',
      width: 1200,
      height: 630,
      alt: 'AutoBooker AI - Assistant de Réservation Intelligent'
    }]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AutoBooker AI - Réservations 24/7. IA, zéro friction.',
    description: 'Assistant IA qui transforme chaque demande en rendez-vous confirmé. +300% de conversions clients.',
    images: ['/og-image.jpg']
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
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className="scroll-smooth">
      <head>
        {/* Schema.org JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "AutoBooker AI",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "description": "Assistant IA pour automatiser les réservations et la gestion de calendrier",
              "offers": {
                "@type": "Offer",
                "price": "29",
                "priceCurrency": "EUR",
                "priceValidUntil": "2025-12-31",
                "availability": "https://schema.org/InStock"
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.9",
                "ratingCount": "500"
              },
              "featureList": [
                "IA conversationnelle avancée",
                "Synchronisation multi-calendriers",
                "Notifications multi-canal",
                "Analytics prédictifs",
                "Sécurité niveau entreprise",
                "API complète"
              ]
            })
          }}
        />
        
        {/* Favicon et app icons */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* Preconnect pour les performances */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch pour les services externes */}
        <link rel="dns-prefetch" href="//api.resend.com" />
        <link rel="dns-prefetch" href="//api.twilio.com" />
        <link rel="dns-prefetch" href="//googleapis.com" />
      </head>
      
      <body className={`${inter.className} bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen antialiased`}>
        <ErrorProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ErrorProvider>
        
        {/* Analytics et tracking (production only) */}
        {process.env.NODE_ENV === 'production' && (
          <>
            {/* Vercel Analytics */}
            <script defer src="https://va.vercel-scripts.com/v1/script.js"></script>
            
            {/* Google Analytics */}
            {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID && (
              <>
                <script
                  async
                  src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`}
                />
                <script
                  dangerouslySetInnerHTML={{
                    __html: `
                      window.dataLayer = window.dataLayer || [];
                      function gtag(){dataLayer.push(arguments);}
                      gtag('js', new Date());
                      gtag('config', '${process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}', {
                        page_title: document.title,
                        page_location: window.location.href,
                      });
                    `,
                  }}
                />
              </>
            )}
          </>
        )}
      </body>
    </html>
  )
}
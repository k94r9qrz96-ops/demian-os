import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SITE } from "@/lib/site";
import { FAQ } from "@/data/faq";

const title = "Beloti Travel — Agência de viagens em São Bernardo do Campo | O mundo é grande";
const description =
  "Agência de viagens familiar em São Bernardo do Campo (SP). Pacotes nacionais e internacionais, cruzeiros, passagens aéreas, hospedagem, seguro viagem, transfers e viagens corporativas, com atendimento personalizado pelo WhatsApp.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title,
  description,
  applicationName: SITE.name,
  keywords: [
    "agência de viagens",
    "agência de viagens São Bernardo do Campo",
    "pacotes de viagem",
    "cruzeiros",
    "viagens corporativas",
    "seguro viagem",
    "Beloti Travel",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: SITE.name,
    title: "Beloti Travel — O mundo é grande. A sua próxima história começa aqui.",
    description,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Costa do Rio de Janeiro vista do alto — Beloti Travel" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Beloti Travel — O mundo é grande.",
    description,
    images: ["/og-image.jpg"],
  },
  icons: { apple: "/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08273b",
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/apple-touch-icon.png`,
    image: `${SITE.url}/og-image.jpg`,
    email: SITE.email,
    telephone: SITE.phoneE164,
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE.city,
      addressRegion: SITE.region,
      addressCountry: "BR",
    },
    areaServed: "BR",
    sameAs: [SITE.instagram, SITE.facebook],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preload" as="font" type="font/woff2" href="/fonts/cormorant-garamond-latin-500-normal.woff2" crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href="/fonts/cormorant-garamond-latin-400-italic.woff2" crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/woff2" href="/fonts/manrope-latin-wght-normal.woff2" crossOrigin="anonymous" />
        <link rel="preload" as="image" type="image/avif" media="(max-aspect-ratio: 1/1)" imageSrcSet="/img/hero-poster-m-640.avif 640w, /img/hero-poster-m-1280.avif 720w" imageSizes="100vw" />
        <link rel="preload" as="image" type="image/avif" media="(min-aspect-ratio: 1/1)" imageSrcSet="/img/hero-poster-d-640.avif 640w, /img/hero-poster-d-1280.avif 1280w" imageSizes="100vw" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
        {children}
      </body>
    </html>
  );
}

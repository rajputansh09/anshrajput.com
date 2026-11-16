import type { Metadata, Viewport } from "next";
import "@fontsource-variable/schibsted-grotesk";
import "@fontsource-variable/jetbrains-mono";
import "./globals.css";
import { site } from "../lib/site";

const title = "Ansh Rajput | Software Engineer";
const description =
  "Ansh Rajput is a software engineer in Edmonton and a Computer Engineering co-op student at the University of Alberta. He builds full-stack platforms that real businesses run on.";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: title, template: "%s | Ansh Rajput" },
  description,
  applicationName: "Ansh Rajput",
  authors: [{ name: "Ansh Rajput", url: site.url }],
  creator: "Ansh Rajput",
  keywords: ["Ansh Rajput", "Ansh", "Rajput", "Ansh Rajput software engineer", "Ansh Rajput University of Alberta", "Ansh Rajput UCert", "Ansh Rajput Edmonton", "full-stack developer Edmonton"],
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description: "Software engineer building platforms that real businesses run on. Two client platforms in production, one SaaS in the works.",
    url: site.url,
    siteName: "Ansh Rajput",
    type: "profile",
    firstName: "Ansh",
    lastName: "Rajput",
    locale: "en_CA",
  },
  twitter: { card: "summary_large_image", title, description },
  // icons live under /icons and get rechecked on every visit, so an old cached logo can't stick around again
  icons: {
    icon: [
      { url: "/icons/crest.svg", type: "image/svg+xml" },
      { url: "/icons/crest-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/crest-32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/icons/crest-96.png",
    apple: [{ url: "/icons/crest-180.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#07110c", colorScheme: "dark" };

// JSON-LD so search engines tie this site, my LinkedIn, GitHub and UCert to me
const person = {
  "@type": "Person",
  "@id": `${site.url}/#person`,
  name: "Ansh Rajput",
  givenName: "Ansh",
  familyName: "Rajput",
  url: site.url,
  image: `${site.url}/ansh-rajput.webp`,
  description,
  jobTitle: "Software Engineer",
  hasOccupation: { "@type": "Occupation", name: "Software Engineer", occupationLocation: { "@type": "City", name: "Edmonton" } },
  email: `mailto:${site.email}`,
  address: { "@type": "PostalAddress", addressLocality: "Edmonton", addressRegion: "AB", addressCountry: "CA" },
  affiliation: { "@type": "CollegeOrUniversity", name: "University of Alberta", url: "https://www.ualberta.ca" },
  founder: {
    "@type": "Organization",
    name: "UCert",
    description: "Multi-tenant ISO certification platform that generates each standard's preloaded Word documents and keeps every certification record in one place.",
  },
  sameAs: [site.github, site.linkedin],
  knowsLanguage: ["English", "Hindi", "Punjabi"],
  knowsAbout: [
    "Software engineering", "Full-stack web development", "Next.js", "React", "TypeScript", "JavaScript", "Node.js", "Express",
    "PostgreSQL", "Supabase", "Stripe", "Technical SEO", "C", "C++", "Python", "Unreal Engine 5", "ISO 9001",
  ],
};
const schema = {
  "@context": "https://schema.org",
  "@graph": [
    person,
    { "@type": "WebSite", "@id": `${site.url}/#website`, url: site.url, name: "Ansh Rajput", inLanguage: "en-CA", publisher: { "@id": `${site.url}/#person` } },
    { "@type": "ProfilePage", "@id": `${site.url}/#profile`, url: site.url, name: title, mainEntity: { "@id": `${site.url}/#person` } },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import PageShell from "../../components/PageShell";
import { site } from "../../lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What anshrajput.com collects, why, and what it does not do.",
  alternates: { canonical: "/privacy" },
  openGraph: { title: "Privacy | Ansh Rajput", description: "What anshrajput.com collects, why, and what it does not do.", url: "/privacy", siteName: "Ansh Rajput", type: "website", locale: "en_CA" },
};

export default function Privacy() {
  return (
    <PageShell>
      <p className="plain-code">Privacy</p>
      <h1>What this site keeps, and what it does not.</h1>
      <p className="plain-lede">Last updated November 2026. This is a personal portfolio, so the answer is short.</p>
      <div className="plain-body">
        <h2>The contact form</h2>
        <p>
          When you send a message, the form passes your name, email, optional company, the topic you picked and your
          message to <a href="https://resend.com" target="_blank" rel="noreferrer">Resend</a>, the email service that
          delivers it to my inbox and sends you a short confirmation. I use your details only to reply to you. They are not
          stored in a database on this site, not added to any mailing list, and never sold or shared.
        </p>
        <h2>No tracking</h2>
        <p>
          There are no analytics, advertising or tracking scripts, and no cookies. The site is hosted on{" "}
          <a href="https://vercel.com" target="_blank" rel="noreferrer">Vercel</a>, which keeps standard server logs (such
          as IP address and the page requested) for a short time to run and protect the service.
        </p>
        <h2>Saved in your own browser</h2>
        <p>
          A few things are saved in your browser&rsquo;s local storage so the site remembers them on your next visit: your
          game progress, best scores and stars, whether game sound is on, where the dragon flies, and which skills on the
          astrolabe you have explored. They never leave your device, and clearing your browser&rsquo;s site data removes
          them.
        </p>
        <h2>The clock in the contact section</h2>
        <p>
          The line that says what time it is where I am uses my own approximate city, which my laptop reports to the site.
          Nothing about visitors&rsquo; locations is collected.
        </p>
        <h2>Questions</h2>
        <p>
          Email <a href={`mailto:${site.email}`}>{site.email}</a> and I will answer, or delete anything you have sent me.
        </p>
      </div>
    </PageShell>
  );
}

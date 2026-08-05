import type { Metadata } from "next";
import { ContactPageContent } from "@/components/contact-page-content";
import { siteConfig } from "@/lib/data";

export const metadata: Metadata = {
  title: `Contact — ${siteConfig.name}`,
  description:
    "Get in touch about a project or request Joshua Russell's resume.",
  openGraph: {
    title: `Contact — ${siteConfig.name}`,
    description:
      "Get in touch about a project or request Joshua Russell's resume.",
    url: `${siteConfig.url}/contact`,
  },
};

export default function ContactPage() {
  return <ContactPageContent />;
}

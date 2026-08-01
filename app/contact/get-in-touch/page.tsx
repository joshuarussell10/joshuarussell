import type { Metadata } from "next";
import { GetInTouchPageContent } from "@/components/contact-page-content";
import { contactPage, siteConfig } from "@/lib/data";

export const metadata: Metadata = {
  title: `${contactPage.getInTouch.title} — ${siteConfig.name}`,
  description: contactPage.getInTouch.description,
  openGraph: {
    title: `${contactPage.getInTouch.title} — ${siteConfig.name}`,
    description: contactPage.getInTouch.description,
    url: `${siteConfig.url}/contact/get-in-touch`,
  },
};

export default function GetInTouchPage() {
  return <GetInTouchPageContent />;
}

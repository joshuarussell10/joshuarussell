import type { Metadata } from "next";
import { RequestResumePageContent } from "@/components/contact-page-content";
import { contactPage, siteConfig } from "@/lib/data";

export const metadata: Metadata = {
  title: `${contactPage.requestResume.title} — ${siteConfig.name}`,
  description: contactPage.requestResume.description,
  openGraph: {
    title: `${contactPage.requestResume.title} — ${siteConfig.name}`,
    description: contactPage.requestResume.description,
    url: `${siteConfig.url}/contact/request-resume`,
  },
};

export default function RequestResumePage() {
  return <RequestResumePageContent />;
}

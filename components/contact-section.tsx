"use client";

import { Button, Card } from "@heroui/react";
import Link from "next/link";
import { contactPage, siteConfig } from "@/lib/data";

export function ContactSection() {
  return (
    <section id="contact" className="section-container pb-32">
      <Card className="glass-panel overflow-hidden">
        <div className="grid lg:grid-cols-2">
          <div className="border-site border-b p-8 md:p-12 lg:border-b-0 lg:border-r">
            <p className="mb-3 font-mono text-sm uppercase tracking-widest text-site-accent">
              Contact
            </p>
            <h2 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
              {contactPage.title}
            </h2>
            <p className="mb-8 max-w-md text-site-muted">
              {contactPage.description}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/contact/get-in-touch">
                <Button variant="primary" size="lg">
                  Get in touch
                </Button>
              </Link>
              <Link href="/contact/request-resume">
                <Button variant="secondary" size="lg">
                  Request resume
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-6 p-8 md:p-12">
            <div>
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-site-faint">
                GitHub
              </p>
              <a
                href={siteConfig.social.github}
                target="_blank"
                rel="noreferrer"
                className="text-lg text-site-muted transition hover:text-[var(--site-fg)]"
              >
                {siteConfig.social.github.replace("https://", "")}
              </a>
            </div>
            <div>
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-site-faint">
                Status
              </p>
              <p className="text-lg text-site-success">
                {siteConfig.availability}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}

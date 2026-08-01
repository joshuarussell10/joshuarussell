"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Input, Label, TextArea, TextField } from "@heroui/react";
import { buildMailtoUrl } from "@/lib/mailto";
import { contactPage, siteConfig } from "@/lib/data";

function ContactBackLink({ href = "/contact", label = "← Back to contact" }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="mb-6 inline-block font-mono text-xs uppercase tracking-widest text-site-faint transition hover:text-site-subtle"
    >
      {label}
    </Link>
  );
}

function ContactPageHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-12 max-w-2xl">
      <ContactBackLink href={backHref} label={backLabel} />
      <p className="mb-3 font-mono text-sm uppercase tracking-widest text-site-accent">
        {eyebrow}
      </p>
      <h1 className="mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
        {title}
      </h1>
      <p className="text-lg text-site-muted">{description}</p>
    </div>
  );
}

function ContactFooterLinks() {
  return (
    <div className="mt-12 flex flex-wrap gap-6 text-sm text-site-subtle">
      <a
        href={`mailto:${siteConfig.email}`}
        className="transition hover:text-[var(--site-fg)]"
      >
        {siteConfig.email}
      </a>
      <a
        href={siteConfig.social.linkedin}
        target="_blank"
        rel="noreferrer"
        className="transition hover:text-[var(--site-fg)]"
      >
        LinkedIn
      </a>
      <a
        href={siteConfig.social.github}
        target="_blank"
        rel="noreferrer"
        className="transition hover:text-[var(--site-fg)]"
      >
        GitHub
      </a>
    </div>
  );
}

type GetInTouchFormProps = {
  subject: string;
  submitLabel: string;
};

function GetInTouchForm({
  subject,
  submitLabel,
}: GetInTouchFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company: ${company}` : null,
      "",
      message,
    ]
      .filter(Boolean)
      .join("\n");

    window.location.href = buildMailtoUrl({
      to: siteConfig.email,
      subject,
      body,
    });
  };

  return (
    <Card className="glass-panel p-6 md:p-8">
      <Card.Content>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <TextField fullWidth isRequired>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
          </TextField>

          <TextField fullWidth isRequired>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </TextField>

          <TextField fullWidth>
            <Label>Company</Label>
            <Input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Optional"
            />
          </TextField>

          <TextField fullWidth isRequired>
            <Label>Message</Label>
            <TextArea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell me about the project, timeline, and how I can help."
              rows={5}
            />
          </TextField>

          <Button type="submit" variant="primary" size="lg" fullWidth>
            {submitLabel}
          </Button>
        </form>
      </Card.Content>
    </Card>
  );
}

type RequestResumeFormProps = {
  subject: string;
  submitLabel: string;
  downloadLabel: string;
};

function RequestResumeForm({
  subject,
  submitLabel,
  downloadLabel,
}: RequestResumeFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [note, setNote] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company: ${company}` : null,
      note ? `\nNote: ${note}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    window.location.href = buildMailtoUrl({
      to: siteConfig.email,
      subject,
      body,
    });
  };

  return (
    <Card className="glass-panel p-6 md:p-8">
      <Card.Content>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <TextField fullWidth isRequired>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
          </TextField>

          <TextField fullWidth isRequired>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
          </TextField>

          <TextField fullWidth>
            <Label>Company or role</Label>
            <Input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="Optional"
            />
          </TextField>

          <TextField fullWidth>
            <Label>Note</Label>
            <TextArea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional context for your request"
              rows={4}
            />
          </TextField>

          <div className="flex flex-col gap-3">
            <Button type="submit" variant="primary" size="lg" fullWidth>
              {submitLabel}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onPress={() => {
                window.open(siteConfig.resume.pdfUrl, "_blank", "noopener,noreferrer");
              }}
            >
              {downloadLabel}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
}

const contactOptions = [
  {
    href: "/contact/get-in-touch",
    title: contactPage.getInTouch.title,
    description: contactPage.getInTouch.description,
    cta: "Continue",
  },
  {
    href: "/contact/request-resume",
    title: contactPage.requestResume.title,
    description: contactPage.requestResume.description,
    cta: "Continue",
  },
] as const;

export function ContactPageContent() {
  return (
    <main className="section-container pt-32 pb-24">
      <ContactPageHeader
        eyebrow="Contact"
        title={contactPage.title}
        description={contactPage.description}
        backHref="/"
        backLabel="← Back to home"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {contactOptions.map((option) => (
          <Link
            key={option.href}
            href={option.href}
            className="glass-panel group block p-6 transition md:p-8"
          >
            <h2 className="mb-3 text-2xl font-semibold tracking-tight">
              {option.title}
            </h2>
            <p className="mb-8 text-site-muted">{option.description}</p>
            <span className="font-mono text-xs uppercase tracking-widest text-site-accent transition group-hover:text-[var(--site-fg)]">
              {option.cta} →
            </span>
          </Link>
        ))}
      </div>

      <ContactFooterLinks />
    </main>
  );
}

export function GetInTouchPageContent() {
  return (
    <main className="section-container pt-32 pb-24">
      <ContactPageHeader
        eyebrow="Contact"
        title={contactPage.getInTouch.title}
        description={contactPage.getInTouch.description}
      />

      <div className="mx-auto max-w-xl">
        <GetInTouchForm {...contactPage.getInTouch} />
      </div>

      <ContactFooterLinks />
    </main>
  );
}

export function RequestResumePageContent() {
  return (
    <main className="section-container pt-32 pb-24">
      <ContactPageHeader
        eyebrow="Contact"
        title={contactPage.requestResume.title}
        description={contactPage.requestResume.description}
      />

      <div className="mx-auto max-w-xl">
        <RequestResumeForm {...contactPage.requestResume} />
      </div>

      <ContactFooterLinks />
    </main>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Button, Card, Input, Label, TextArea, TextField } from "@heroui/react";
import { buildMailtoUrl } from "@/lib/mailto";
import { contactPage, siteConfig } from "@/lib/data";

function ContactBackLink({
  href = "/contact",
  label = "← Back to contact",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="mb-8 inline-block font-mono text-xs uppercase tracking-widest text-site-faint transition hover:text-site-subtle"
    >
      {label}
    </Link>
  );
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 font-mono text-xs uppercase tracking-widest text-site-faint">
        {label}
      </p>
      <div className="text-base text-site-muted">{children}</div>
    </div>
  );
}

function FormPageShell({
  title,
  description,
  details,
  children,
}: {
  title: string;
  description: string;
  details: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="section-container pt-28 pb-24 md:pt-32">
      <ContactBackLink />

      <Card className="glass-panel overflow-hidden">
        <div className="grid md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="border-site flex flex-col gap-8 border-b p-8 md:min-h-[32rem] md:justify-between md:gap-12 md:border-b-0 md:border-r md:p-10 lg:p-12">
            <div>
              <p className="mb-3 font-mono text-sm uppercase tracking-widest text-site-accent">
                Contact
              </p>
              <h1 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">
                {title}
              </h1>
              <p className="max-w-sm text-site-muted">{description}</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-3 md:grid-cols-1 md:gap-5">
              {details}
            </div>
          </div>

          <div className="flex flex-col justify-center p-8 md:p-10 lg:p-12">
            {children}
          </div>
        </div>
      </Card>
    </main>
  );
}

type GetInTouchFormProps = {
  subject: string;
  submitLabel: string;
};

function GetInTouchForm({ subject, submitLabel }: GetInTouchFormProps) {
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
          rows={6}
        />
      </TextField>

      <Button type="submit" variant="primary" size="lg" fullWidth>
        {submitLabel}
      </Button>
    </form>
  );
}

type RequestResumeFormProps = {
  subject: string;
  submitLabel: string;
};

function RequestResumeForm({
  subject,
  submitLabel,
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
          rows={5}
        />
      </TextField>

      <Button type="submit" variant="primary" size="lg" fullWidth>
        {submitLabel}
      </Button>
    </form>
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
      <ContactBackLink href="/" label="← Back to home" />

      <div className="mb-12 max-w-2xl">
        <p className="mb-3 font-mono text-sm uppercase tracking-widest text-site-accent">
          Contact
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {contactPage.title}
        </h1>
        <p className="text-lg text-site-muted">{contactPage.description}</p>
      </div>

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

      <div className="mt-12 flex flex-wrap gap-6 text-sm text-site-subtle">
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
    </main>
  );
}

export function GetInTouchPageContent() {
  return (
    <FormPageShell
      title={contactPage.getInTouch.title}
      description={contactPage.getInTouch.description}
      details={
        <>
          <DetailItem label="Response">Usually within 1–2 business days</DetailItem>
          <DetailItem label="Status">
            <span className="text-site-success">{siteConfig.availability}</span>
          </DetailItem>
          <DetailItem label="LinkedIn">
            <a
              href={siteConfig.social.linkedin}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-[var(--site-fg)]"
            >
              {siteConfig.social.linkedin.replace("https://", "").replace("www.", "")}
            </a>
          </DetailItem>
        </>
      }
    >
      <GetInTouchForm {...contactPage.getInTouch} />
    </FormPageShell>
  );
}

export function RequestResumePageContent() {
  return (
    <FormPageShell
      title={contactPage.requestResume.title}
      description={contactPage.requestResume.description}
      details={
        <>
          <DetailItem label="Delivery">PDF sent after a short intro</DetailItem>
          <DetailItem label="Status">
            <span className="text-site-success">{siteConfig.availability}</span>
          </DetailItem>
          <DetailItem label="LinkedIn">
            <a
              href={siteConfig.social.linkedin}
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-[var(--site-fg)]"
            >
              {siteConfig.social.linkedin.replace("https://", "").replace("www.", "")}
            </a>
          </DetailItem>
        </>
      }
    >
      <RequestResumeForm {...contactPage.requestResume} />
    </FormPageShell>
  );
}

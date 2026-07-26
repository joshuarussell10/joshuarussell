"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Input, Label, TextArea, TextField } from "@heroui/react";
import { buildMailtoUrl } from "@/lib/mailto";
import { contactPage, siteConfig } from "@/lib/data";

type GetInTouchFormProps = {
  title: string;
  description: string;
  subject: string;
  submitLabel: string;
};

function GetInTouchForm({
  title,
  description,
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
    <Card className="glass-panel h-full p-6 md:p-8">
      <Card.Header className="mb-6 block">
        <Card.Title className="text-2xl font-semibold">{title}</Card.Title>
        <Card.Description className="mt-2 text-site-muted">
          {description}
        </Card.Description>
      </Card.Header>

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
  title: string;
  description: string;
  subject: string;
  submitLabel: string;
  downloadLabel: string;
};

function RequestResumeForm({
  title,
  description,
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
    <Card className="glass-panel h-full p-6 md:p-8">
      <Card.Header className="mb-6 block">
        <Card.Title className="text-2xl font-semibold">{title}</Card.Title>
        <Card.Description className="mt-2 text-site-muted">
          {description}
        </Card.Description>
      </Card.Header>

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

export function ContactPageContent() {
  return (
    <main className="section-container pt-32 pb-24">
      <div className="mb-12 max-w-2xl">
        <Link
          href="/"
          className="mb-6 inline-block font-mono text-xs uppercase tracking-widest text-site-faint transition hover:text-site-subtle"
        >
          ← Back to home
        </Link>
        <p className="mb-3 font-mono text-sm uppercase tracking-widest text-site-accent">
          Contact
        </p>
        <h1 className="mb-4 text-4xl font-semibold tracking-tight md:text-5xl">
          {contactPage.title}
        </h1>
        <p className="text-lg text-site-muted">{contactPage.description}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <GetInTouchForm {...contactPage.getInTouch} />
        <div id="request-resume">
          <RequestResumeForm {...contactPage.requestResume} />
        </div>
      </div>

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
    </main>
  );
}

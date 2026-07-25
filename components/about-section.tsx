import { Card } from "@heroui/react";
import { aboutContent } from "@/lib/data";

export function AboutSection() {
  return (
    <section id="about" className="section-container">
      <div className="mb-12 max-w-2xl">
        <p className="mb-3 font-mono text-sm uppercase tracking-widest text-site-accent">
          About
        </p>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {aboutContent.headline}
        </h2>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5 text-base leading-relaxed text-site-muted">
          {aboutContent.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 32)}>{paragraph}</p>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {aboutContent.highlights.map((item) => (
            <Card key={item.label} className="glass-panel p-5">
              <Card.Header>
                <Card.Title className="text-2xl font-semibold">
                  {item.label}
                </Card.Title>
              </Card.Header>
              <Card.Content>
                <p className="text-sm text-site-subtle">{item.detail}</p>
              </Card.Content>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

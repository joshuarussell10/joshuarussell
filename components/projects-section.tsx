"use client";

import { Button, Card, Chip } from "@heroui/react";
import { projects } from "@/lib/data";

export function ProjectsSection() {
  return (
    <section id="work" className="section-container">
      <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="mb-3 font-mono text-sm uppercase tracking-widest text-site-accent">
            Selected Work
          </p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Projects I&apos;ve delivered for clients
          </h2>
        </div>
        <p className="max-w-sm text-sm text-site-faint">
          Representative contract engagements. Details anonymized where required
          by NDAs.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {projects.map((project) => (
          <Card
            key={project.title}
            className="glass-panel group transition"
          >
            <Card.Header className="flex flex-row items-start justify-between gap-4">
              <div>
                <Card.Title className="text-xl font-semibold">
                  {project.title}
                </Card.Title>
                {project.highlight && (
                  <Card.Description className="mt-1 font-mono text-xs text-site-faint">
                    {project.highlight}
                  </Card.Description>
                )}
              </div>
            </Card.Header>
            <Card.Content>
              <p className="mb-5 text-sm leading-relaxed text-site-muted">
                {project.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <Chip key={tag} variant="soft" size="sm">
                    {tag}
                  </Chip>
                ))}
              </div>
            </Card.Content>
            {(project.href || project.github) && (
              <Card.Footer className="gap-3">
                {project.href && (
                  <Button
                    variant="tertiary"
                    size="sm"
                    onPress={() => {
                      window.open(project.href, "_blank", "noopener,noreferrer");
                    }}
                  >
                    View project
                  </Button>
                )}
                {project.github && (
                  <Button
                    variant="tertiary"
                    size="sm"
                    onPress={() => {
                      window.open(project.github, "_blank", "noopener,noreferrer");
                    }}
                  >
                    Source
                  </Button>
                )}
              </Card.Footer>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

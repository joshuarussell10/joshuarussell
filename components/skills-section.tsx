import { Card, Chip } from "@heroui/react";
import { skillGroups } from "@/lib/data";

export function SkillsSection() {
  return (
    <section id="skills" className="section-container">
      <div className="mb-12 max-w-2xl">
        <p className="mb-3 font-mono text-sm uppercase tracking-widest text-site-accent">
          Skills
        </p>
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Tools and disciplines I bring to engagements
        </h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {skillGroups.map((group) => (
          <Card key={group.category} className="glass-panel p-6">
            <Card.Header>
              <Card.Title className="text-lg font-semibold">
                {group.category}
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <Chip key={item} variant="soft" size="sm">
                    {item}
                  </Chip>
                ))}
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>
    </section>
  );
}

"use client";

import { Button, Chip } from "@heroui/react";
import { WebGLBackground } from "@/components/webgl-background";
import { siteConfig } from "@/lib/data";

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-20">
      <WebGLBackground />

      <div className="section-container relative z-10">
        <div className="max-w-3xl">
          <Chip
            variant="soft"
            color="accent"
            className="animate-fade-up mb-6"
          >
            {siteConfig.availability}
          </Chip>

          <h1 className="animate-fade-up-delay-1 mb-6 text-4xl font-semibold tracking-tight md:text-6xl lg:text-7xl">
            <span className="gradient-text">{siteConfig.name}</span>
          </h1>

          <p className="animate-fade-up-delay-2 mb-4 max-w-2xl text-lg text-site-muted md:text-xl">
            {siteConfig.title}. I help teams ship dependable software — from
            architecture and APIs to polished, performant interfaces.
          </p>

          <p className="animate-fade-up-delay-2 mb-10 font-mono text-sm text-site-faint">
            {siteConfig.location}
          </p>

          <div className="animate-fade-up-delay-3 flex flex-wrap gap-4">
            <Button
              variant="primary"
              size="lg"
              onPress={() => {
                document.getElementById("work")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              View my work
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onPress={() => {
                document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Start a conversation
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

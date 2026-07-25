"use client";

import dynamic from "next/dynamic";
import { Button } from "@heroui/react";
import { useHeroInteraction } from "@/components/hero-network-canvas";
import { RoleRotator } from "@/components/role-rotator";
import { heroTagline, siteConfig } from "@/lib/data";

const HeroNetworkCanvas = dynamic(
  () =>
    import("@/components/hero-network-canvas").then(
      (mod) => mod.HeroNetworkCanvas
    ),
  { ssr: false }
);

export function HeroSection() {
  const { mouse, interactive, onPointerMove, onPointerLeave } =
    useHeroInteraction();

  return (
    <section
      className="hero-editorial relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-20"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <HeroNetworkCanvas mouse={mouse} interactive={interactive} />

      <div className="section-container relative z-10 flex flex-col items-center py-16 text-center">
        <p className="animate-fade-up mb-6 font-mono text-xs uppercase tracking-[0.2em] text-site-faint">
          {siteConfig.availability} · {siteConfig.location}
        </p>

        <h1 className="animate-fade-up-delay-1 mb-4 text-5xl font-semibold tracking-tight md:text-7xl lg:text-8xl">
          <span className="gradient-text">{siteConfig.name}</span>
        </h1>

        <div className="animate-fade-up-delay-2">
          <RoleRotator />
        </div>

        <p className="animate-fade-up-delay-2 mx-auto mb-10 max-w-2xl text-lg text-site-muted md:text-xl">
          {heroTagline}
        </p>

        <div className="animate-fade-up-delay-3 flex flex-wrap justify-center gap-4">
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

      <a
        href="#about"
        className="scroll-cue absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        aria-label="Scroll to about section"
      >
        <span className="mb-2 block font-mono text-xs uppercase tracking-widest text-site-faint">
          Scroll
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mx-auto text-site-subtle"
          aria-hidden
        >
          <path d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
      </a>
    </section>
  );
}

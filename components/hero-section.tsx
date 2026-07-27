"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { useHeroInteraction } from "@/components/hero-webgl/use-hero-interaction";
import { RoleRotator } from "@/components/role-rotator";
import { heroTagline, siteConfig } from "@/lib/data";

const HeroBadgeCanvas = dynamic(
  () =>
    import("@/components/hero-webgl/hero-badge-canvas").then(
      (mod) => mod.HeroBadgeCanvas
    ),
  { ssr: false }
);

function useLargeScreen() {
  const [isLarge, setIsLarge] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLarge(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isLarge;
}

export function HeroSection() {
  const router = useRouter();
  const showBadge = useLargeScreen();
  const {
    mouse,
    interactive,
    pointerActive,
    onPointerEnter,
    onPointerMove,
    onPointerLeave,
  } = useHeroInteraction();

  return (
    <section
      className="hero-editorial relative flex min-h-screen flex-col justify-start overflow-hidden pt-36 md:pt-40 lg:pt-44"
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div className="hero-bg pointer-events-none absolute inset-0 z-0" aria-hidden />

      {showBadge ? (
        <div className="hero-visual pointer-events-none absolute inset-y-0 right-12 z-[1] hidden w-[min(54%,700px)] lg:block xl:right-16">
          <HeroBadgeCanvas
            mouse={mouse}
            interactive={interactive}
            pointerActive={pointerActive}
          />
        </div>
      ) : null}

      <div className="section-container relative z-10 py-6 md:py-8 lg:py-10">
        <div className="hero-split grid grid-cols-1 items-start lg:grid-cols-2 lg:gap-12 xl:gap-16">
          <div className="hero-copy flex flex-col items-center text-center lg:items-start lg:text-left">
            <h1 className="animate-fade-up mb-4 whitespace-nowrap text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl xl:text-7xl">
              <span className="gradient-text">{siteConfig.name}</span>
            </h1>

            <div className="animate-fade-up-delay-1 w-full">
              <RoleRotator className="mx-auto mb-5 lg:mx-0" />
            </div>

            <p className="animate-fade-up-delay-2 mb-8 max-w-xl text-lg text-site-muted md:text-xl">
              {heroTagline}
            </p>

            <div className="animate-fade-up-delay-3 flex w-full flex-wrap justify-center gap-4 lg:justify-start">
              <Button
                variant="primary"
                size="lg"
                onPress={() => {
                  document
                    .getElementById("work")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                View my work
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onPress={() => {
                  router.push("/contact");
                }}
              >
                Start a conversation
              </Button>
            </div>
          </div>

          {/* Reserve the right column so copy stays left-weighted next to the badge. */}
          {showBadge ? <div className="hidden lg:block" aria-hidden /> : null}
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

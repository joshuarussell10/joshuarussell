"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { useHeroInteraction } from "@/components/hero-webgl/use-hero-interaction";
import { RoleRotator } from "@/components/role-rotator";
import { heroTagline, siteConfig } from "@/lib/data";
import { inter } from "@/lib/fonts";

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
      className="hero-editorial relative flex min-h-screen flex-col overflow-hidden"
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div
        className="hero-bg pointer-events-none absolute inset-0 z-0"
        aria-hidden
      />

      {/* Full-height absolute canvas — out of flow, anchored to the viewport top */}
      {showBadge ? (
        <div className="hero-visual pointer-events-none absolute inset-y-0 right-12 z-[1] hidden w-[min(54%,700px)] lg:block xl:right-16">
          <HeroBadgeCanvas
            mouse={mouse}
            interactive={interactive}
            pointerActive={pointerActive}
          />
        </div>
      ) : null}

      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center overflow-visible pt-28 md:pt-32">
        <div className="relative flex w-full max-w-7xl flex-col items-center px-6 md:px-8 lg:flex-row">
          <div className="w-full lg:w-3/5 lg:pr-0 lg:pl-12">
            <h1
              className={`${inter.className} animate-fade-up text-center tracking-tighter lg:text-left`}
            >
              <span className="bg-gradient-text block bg-[length:150%_100%] bg-clip-text bg-no-repeat text-5xl leading-tight font-semibold tracking-tighter text-transparent md:text-7xl">
                {siteConfig.name}
              </span>
            </h1>

            <div className="animate-fade-up-delay-1 mt-4 w-full">
              <RoleRotator className="mx-auto mb-5 lg:mx-0" />
            </div>

            <p className="animate-fade-up-delay-2 mt-2 max-w-xl text-center text-lg text-site-muted md:text-xl lg:text-left">
              {heroTagline}
            </p>

            <div className="animate-fade-up-delay-3 mt-8 flex w-full flex-wrap justify-center gap-4 lg:justify-start">
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

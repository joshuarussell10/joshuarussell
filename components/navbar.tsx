"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { navLinks, siteConfig } from "@/lib/data";

function getHashId(href: string) {
  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) return null;
  return href.slice(hashIndex + 1) || null;
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // After navigating to /#section from another page, scroll once the home page is ready
  useEffect(() => {
    if (pathname !== "/") return;

    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const frame = requestAnimationFrame(() => scrollToSection(hash));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  function navigateTo(href: string) {
    setMenuOpen(false);

    const id = getHashId(href);
    if (id) {
      if (pathname === "/") {
        window.history.pushState(null, "", `#${id}`);
        scrollToSection(id);
      } else {
        router.push(`/#${id}`);
      }
      return;
    }

    router.push(href);
  }

  function goHome(event: MouseEvent<HTMLAnchorElement>) {
    setMenuOpen(false);

    if (pathname === "/") {
      event.preventDefault();
      if (window.location.hash) {
        window.history.pushState(null, "", "/");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || pathname !== "/"
          ? "border-site border-b bg-nav-scrolled backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[84px] max-w-6xl items-center justify-between px-3">
        <Link
          href="/"
          onClick={goHome}
          className="nav-logo inline-flex shrink-0 items-center"
          aria-label={siteConfig.name}
        >
          <span
            className="nav-logo-img block h-7 aspect-[313/50] md:h-8"
            aria-hidden
          />
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          {navLinks.map((link) => (
            <Button
              key={link.href}
              variant="secondary"
              size="sm"
              onPress={() => navigateTo(link.href)}
            >
              {link.label}
            </Button>
          ))}
          <ThemeToggle />
          <Button
            variant="primary"
            size="sm"
            onPress={() => router.push("/contact")}
          >
            Get in touch
          </Button>
        </div>

        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            className="flex flex-col gap-1.5"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span
              className={`nav-menu-line block h-0.5 w-6 transition ${
                menuOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`nav-menu-line block h-0.5 w-6 transition ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`nav-menu-line block h-0.5 w-6 transition ${
                menuOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="border-site border-t bg-mobile-menu px-6 py-4 backdrop-blur-xl md:hidden">
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <button
                key={link.href}
                type="button"
                className="nav-link text-left text-sm"
                onClick={() => navigateTo(link.href)}
              >
                {link.label}
              </button>
            ))}
            <Button
              variant="primary"
              size="sm"
              onPress={() => router.push("/contact")}
            >
              Get in touch
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

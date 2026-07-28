"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { ThemeToggle } from "@/components/theme-toggle";
import { navLinks, siteConfig } from "@/lib/data";

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

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || pathname !== "/"
          ? "border-site border-b bg-nav-scrolled backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-[84px] max-w-6xl items-center justify-between px-6 md:px-8">
        <Link href="/" className="nav-logo font-mono text-sm tracking-tight">
          {siteConfig.domain}
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          {navLinks.map((link) => (
            <Button
              key={link.href}
              variant="secondary"
              size="sm"
              href={link.href}
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
              <Link
                key={link.href}
                href={link.href}
                className="nav-link text-sm"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
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

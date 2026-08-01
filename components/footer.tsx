import { siteConfig } from "@/lib/data";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-site border-t py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-site-faint md:flex-row md:px-8">
        <p>
          © {year} {siteConfig.name}. Built with Next.js, HeroUI & WebGL.
        </p>
        <div className="flex gap-6">
          <a
            href={siteConfig.social.github}
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-site-subtle"
          >
            GitHub
          </a>
          <a
            href="/contact"
            className="transition hover:text-site-subtle"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  );
}

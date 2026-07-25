export type Project = {
  title: string;
  description: string;
  tags: string[];
  href?: string;
  github?: string;
  highlight?: string;
};

export type SkillGroup = {
  category: string;
  items: string[];
};

export const siteConfig = {
  name: "Joshua Russell",
  title: "Software Engineer & Contract Developer",
  domain: "joshuarussell.com",
  url: "https://joshuarussell.com",
  email: "hello@joshuarussell.com",
  location: "Available for remote contracts",
  social: {
    github: "https://github.com/joshuarussell",
    linkedin: "https://linkedin.com/in/joshuarussell",
  },
  availability: "Open to contract work",
};

export const heroRoles = [
  "Software Engineer",
  "Contract Developer",
  "Full-stack Builder",
  "Systems Architect",
];

export const heroTagline =
  "I help teams ship dependable software — from architecture and APIs to polished, performant interfaces.";

export const aboutContent = {
  headline: "I build software that ships and scales.",
  paragraphs: [
    "I'm a software engineer and independent contractor who partners with teams to deliver production-ready systems — from greenfield products to critical refactors.",
    "I work across the stack with a bias toward clarity: readable code, predictable architecture, and interfaces that feel fast even when the problem space is complex.",
    "Whether you need a focused sprint, ongoing fractional engineering, or help unblocking a high-stakes launch, I bring senior-level execution without the overhead of a large agency.",
  ],
  highlights: [
    { label: "8+ years", detail: "Building production software" },
    { label: "Full-stack", detail: "Frontend, backend, infra" },
    { label: "Remote-first", detail: "Async-friendly collaboration" },
  ],
};

export const projects: Project[] = [
  {
    title: "Platform Migration",
    description:
      "Led a legacy monolith to microservices migration for a fintech client, reducing deploy times by 70% and improving incident recovery.",
    tags: ["TypeScript", "Node.js", "AWS", "PostgreSQL"],
    highlight: "Contract · 6 months",
  },
  {
    title: "Design System & App Shell",
    description:
      "Built a component library and application shell used across three product lines, cutting feature delivery time and UI inconsistency.",
    tags: ["React", "Next.js", "Storybook", "Tailwind"],
    highlight: "Contract · 4 months",
  },
  {
    title: "Real-time Analytics Dashboard",
    description:
      "Shipped a WebSocket-backed analytics dashboard processing 50k+ events/min with sub-second updates and role-based access control.",
    tags: ["React", "Go", "Redis", "WebSockets"],
    highlight: "Contract · 3 months",
  },
  {
    title: "API Gateway & Developer Portal",
    description:
      "Designed and implemented an API gateway with OAuth2, rate limiting, and a self-serve developer portal for external integrators.",
    tags: ["Python", "FastAPI", "Kubernetes", "OpenAPI"],
    highlight: "Contract · 5 months",
  },
];

export const skillGroups: SkillGroup[] = [
  {
    category: "Frontend",
    items: ["React", "Next.js", "TypeScript", "WebGL", "Tailwind CSS"],
  },
  {
    category: "Backend",
    items: ["Node.js", "Python", "Go", "GraphQL", "REST APIs"],
  },
  {
    category: "Infrastructure",
    items: ["AWS", "Docker", "Kubernetes", "CI/CD", "Terraform"],
  },
  {
    category: "Practices",
    items: ["System design", "Code review", "Technical writing", "Mentorship"],
  },
];

export const navLinks = [
  { label: "About", href: "#about" },
  { label: "Work", href: "#work" },
  { label: "Skills", href: "#skills" },
  { label: "Contact", href: "#contact" },
];

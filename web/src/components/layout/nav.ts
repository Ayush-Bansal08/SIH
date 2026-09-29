export const NAV = [
  { href: "/", label: "Overview" },
  { href: "/command-center/", label: "Command Center" },
  { href: "/projects/", label: "Projects" },
  { href: "/advisor/", label: "Reallocation Advisor", highlight: true },
  { href: "/evidence/", label: "Evidence" },
  { href: "/methodology/", label: "Methodology" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  const norm = (s: string) => (s.endsWith("/") ? s : `${s}/`);
  if (href === "/") return pathname === "/";
  return norm(pathname).startsWith(norm(href));
}

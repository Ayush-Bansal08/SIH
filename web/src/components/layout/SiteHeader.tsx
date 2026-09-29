"use client";

import clsx from "clsx";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PrismMark } from "./Logo";
import { NAV, isActive } from "./nav";

export function SiteHeader({ asOf, report }: { asOf: string; report: string }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40">
      {/* Government identity strip */}
      <div className="bg-navy-950 text-[12.5px] text-navy-100">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 sm:px-6">
          <p className="flex items-center gap-2">
            <span className="inline-flex items-center rounded bg-saffron-500/15 px-1.5 py-0.5 font-semibold text-saffron-500 ring-1 ring-inset ring-saffron-500/40">
              PROTOTYPE
            </span>
            <span>
              <span className="font-medium text-white">Smart India Hackathon 2026 · PS SIH26103</span>
              <span className="hidden sm:inline"> — built for MoSPI&apos;s PAIMANA project monitoring</span>
            </span>
          </p>
          <p>Not an official Government of India website · Data: {report}, {asOf}</p>
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 rounded-lg" aria-label="PAIMANA-PRISM home">
            <PrismMark />
            <span className="leading-tight">
              <span className="block text-[15px] font-bold tracking-tight text-navy-950">
                PAIMANA<span className="font-serif text-[17px] font-normal italic">-PRISM</span>
              </span>
              <span className="hidden text-xs text-ink-subtle xl:block">Predictive Risk Intelligence System</span>
            </span>
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-0.5 xl:gap-1">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "relative inline-flex h-9 items-center whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors xl:px-3",
                        active ? "bg-ink text-white" : "text-ink-muted hover:bg-canvas hover:text-ink",
                        "highlight" in item && item.highlight && !active && "text-ink",
                      )}
                    >
                      {item.label}
                      {"highlight" in item && item.highlight && (
                        <span className="ml-1.5 size-1.5 rounded-full bg-saffron-500" aria-hidden />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-lg text-ink hover:bg-canvas lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>

        {open && (
          <nav id="mobile-nav" aria-label="Main" className="border-t border-line bg-surface lg:hidden">
            <ul className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={clsx(
                        "block rounded-md px-3 py-2.5 text-sm font-medium",
                        active ? "bg-navy-50 text-navy-900" : "text-ink-muted hover:bg-canvas",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}

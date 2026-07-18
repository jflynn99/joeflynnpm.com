"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Container } from "./Container";
import { ThemeSwitcher } from "./ThemeSwitcher";

const navLinks = [
  { href: "/blog", label: "Blog" },
  { href: "/projects", label: "Projects" },
  { href: "/books", label: "Books" },
  { href: "/agent", label: "Agent" },
  { href: "/analytics", label: "Analytics" },
  { href: "/about", label: "About" },
];

export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-md backdrop-saturate-150">
      <Container>
        <nav className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xl font-semibold tracking-tight transition-colors hover:text-accent"
            >
              Joe Flynn
            </Link>
            <ThemeSwitcher />
          </div>

          {/* Desktop nav */}
          <ul className="hidden items-center gap-1 sm:flex sm:gap-2">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-card text-accent"
                        : "text-muted hover:bg-card hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Hamburger button (mobile only) */}
          <button
            type="button"
            className="rounded-md p-2 text-muted transition-colors hover:bg-card hover:text-foreground sm:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>
        </nav>
      </Container>

      {/* Mobile dropdown menu — always rendered so the height can animate;
          .mobile-menu keeps it display:none while closed */}
      <div
        className={`mobile-menu border-t border-border bg-background sm:hidden ${
          isMenuOpen ? "is-open" : ""
        }`}
      >
        <Container>
          <ul className="flex flex-col py-2">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={closeMenu}
                    className={`block rounded-md px-3 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-card text-accent"
                        : "text-muted hover:bg-card hover:text-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Container>
      </div>
    </header>
  );
}

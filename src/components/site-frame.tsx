import { useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowUpRightIcon,
  CaretDownIcon,
  ListIcon,
  MagnifyingGlassIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { ThemeSwitch } from "fumadocs-ui/layouts/shared/slots/theme-switch";
import { GithubDark } from "@/components/ui/svgs/githubDark";
import { GithubLight } from "@/components/ui/svgs/githubLight";
import { changelogUrl, gitConfig, libraryVersion } from "@/lib/shared";
import { BrandWordmark } from "@/components/brand-wordmark";

/** Horizontal gutters shared by every full-width band inside the frame. */
export const gutterClassName = "px-4 sm:px-6 lg:px-10";

/**
 * The page frame shared by the landing and chart pages: a column inset a
 * little from the screen edges with a hairline on each side. Bands inside it
 * use `.section-ticks`, so their rules end in ticks against these lines.
 */
export function SiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="border-border mx-1.5 flex flex-1 flex-col border-x sm:mx-3 lg:mx-5">
      {children}
    </div>
  );
}

/** Docs pages by their path under /docs; an empty path is the docs home. */
const DOCS_LINKS = [
  { label: "Docs", page: "" },
  { label: "Guides", page: "guides/settings" },
  { label: "Skills", page: "skills" },
  { label: "API reference", page: "api-reference/chart" },
] as const;

const githubUrl = `https://github.com/${gitConfig.user}`;

const navLinkClassName =
  "text-foreground px-3 py-2 text-[0.9375rem] whitespace-nowrap opacity-80 transition-opacity duration-150 ease-out hover:opacity-100 aria-[current=page]:opacity-100";

const iconButtonClassName =
  "text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-9 items-center justify-center rounded-lg transition-colors duration-150 ease-out";

/** The horoscope tools, grouped under one menu in the bar. */
const HOROSCOPE_LINKS = [
  {
    to: "/chart",
    label: "Birth chart",
    description: "Cast a horoscope from a birth date, time and place",
  },
  {
    to: "/sky",
    label: "Planets now",
    description: "Where the planets stand right now, where you are",
  },
] as const;

/**
 * "Horoscope" in the bar: opens on hover or click and lists the tools, each
 * with a one-line description.
 */
function HoroscopeMenu() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const active = HOROSCOPE_LINKS.some((link) => pathname.startsWith(link.to));
  return (
    <Menu.Root>
      <Menu.Trigger
        openOnHover
        delay={60}
        closeDelay={120}
        data-active={active ? "true" : undefined}
        className={`${navLinkClassName} group inline-flex cursor-default items-center gap-1 outline-none data-[active=true]:opacity-100 data-popup-open:opacity-100 focus-visible:opacity-100`}
      >
        Horoscope
        <CaretDownIcon
          aria-hidden="true"
          className="size-3.5 transition-transform duration-(--duration-fast) ease-(--ease-out) group-data-popup-open:rotate-180"
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          sideOffset={6}
          align="start"
          className="z-50 outline-none"
        >
          <Menu.Popup className="bg-popover text-popover-foreground ring-foreground/5 dark:ring-foreground/10 flex w-72 origin-(--transform-origin) flex-col gap-0.5 rounded-xl p-1.5 shadow-lg ring-1 outline-none transition-[opacity,scale] duration-150 ease-out data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
            {HOROSCOPE_LINKS.map((link) => (
              <Menu.LinkItem
                key={link.to}
                render={<Link to={link.to} />}
                className="data-highlighted:bg-muted aria-[current=page]:[&>span:first-child]:text-primary flex flex-col gap-0.5 rounded-lg px-3 py-2 outline-none"
              >
                <span className="text-foreground text-sm font-medium">
                  {link.label}
                </span>
                <span className="text-muted-foreground text-xs leading-snug">
                  {link.description}
                </span>
              </Menu.LinkItem>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** Opens the docs search dialog the root provider already mounts. */
function SearchButton() {
  const { enabled, hotKey, setOpenSearch, dialogHandle } = useSearchContext();
  if (!enabled) {
    return null;
  }
  const openSearch = () => {
    // Keep focus inside the tap event: iOS won't open the keyboard from
    // the dialog's deferred autofocus alone.
    flushSync(() => setOpenSearch(true));
    document.querySelector<HTMLInputElement>("[data-fd-search-dialog-input]")?.focus({ preventScroll: true });
  };
  return (
    <>
      <Dialog.Trigger
        handle={dialogHandle}
        type="button"
        onClick={openSearch}
        className="border-border/70 bg-card/60 text-muted-foreground hover:text-foreground hidden h-9 w-56 items-center gap-2 rounded-lg border px-3 text-sm transition-colors duration-150 ease-out md:inline-flex lg:w-36 xl:w-72"
      >
        <MagnifyingGlassIcon aria-hidden="true" className="size-4" />
        Search
        {/* Dropped at lg, where the nav links leave the bar little room. */}
        <span className="ms-auto inline-flex gap-0.5 lg:max-xl:hidden">
          {hotKey.map((key, index) => (
            <kbd
              key={index}
              className="bg-muted rounded-md px-1.5 font-mono text-xs leading-5"
            >
              {key.display}
            </kbd>
          ))}
        </span>
      </Dialog.Trigger>
      <Dialog.Trigger
        handle={dialogHandle}
        type="button"
        aria-label="Search docs"
        onClick={openSearch}
        className={`${iconButtonClassName} md:hidden`}
      >
        <MagnifyingGlassIcon aria-hidden="true" className="size-5" />
      </Dialog.Trigger>
    </>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {DOCS_LINKS.map((link) => (
        <Link
          key={link.label}
          to="/docs/$"
          params={{ _splat: link.page }}
          activeOptions={{ exact: link.page === "" }}
          className={navLinkClassName}
          onClick={onNavigate}
        >
          {link.label}
        </Link>
      ))}
      {onNavigate ? (
        <div className="flex flex-col items-start">
          <span className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-[0.14em] uppercase">
            Horoscope
          </span>
          {HOROSCOPE_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={navLinkClassName}
              onClick={onNavigate}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : (
        <HoroscopeMenu />
      )}
      <a
        href={changelogUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Version ${libraryVersion} changelog`}
        className={`${navLinkClassName} group inline-flex items-center gap-1 font-mono text-sm`}
        onClick={onNavigate}
      >
        v{libraryVersion}
        <ArrowUpRightIcon
          aria-hidden="true"
          className="size-3.5 transition-[translate] duration-(--duration-fast) ease-(--ease-out) motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5 motion-safe:group-focus-visible:translate-x-0.5 motion-safe:group-focus-visible:-translate-y-0.5"
        />
      </a>
    </>
  );
}

/**
 * Wordmark and section links on the left; search, GitHub and the theme
 * toggle on the right.
 * Below the large breakpoint the links fold into a menu under the bar.
 */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header>
      <div
        className={`flex w-full items-center justify-between gap-4 py-4 ${gutterClassName}`}
      >
        <div className="flex items-center gap-6">
          <a
            href="/"
            aria-label="Ascendant home"
            className="inline-flex shrink-0 items-center"
          >
            <BrandWordmark className="h-8" />
          </a>
          <nav aria-label="Primary" className="hidden items-center lg:flex">
            <NavLinks />
          </nav>
        </div>
        <div className="flex items-center gap-1.5">
          <SearchButton />
          <a
            href={githubUrl}
            target="_blank"
            rel="noreferrer"
            aria-label="Ascendant on GitHub"
            className={iconButtonClassName}
          >
            <GithubLight aria-hidden="true" className="size-5 dark:hidden" />
            <GithubDark
              aria-hidden="true"
              className="hidden size-5 dark:block"
            />
          </a>
          {/* Control radius to match the icon buttons; the items sit inside
              the 4px padding and 1px border, so they take what is left. */}
          <ThemeSwitch className="rounded-lg *:rounded-[calc(var(--radius)-5px)]" />
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="site-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className={`${iconButtonClassName} lg:hidden`}
          >
            {menuOpen ? (
              <XIcon aria-hidden="true" className="size-5" />
            ) : (
              <ListIcon aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>
      </div>
      {menuOpen ? (
        <nav
          id="site-menu"
          aria-label="Menu"
          className={`section-ticks flex flex-col items-start py-3 lg:hidden ${gutterClassName}`}
        >
          <NavLinks onNavigate={() => setMenuOpen(false)} />
        </nav>
      ) : null}
    </header>
  );
}

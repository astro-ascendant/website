import type { ReactNode } from "react";
import { createFileRoute, createLink, Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { OrreryHero } from "../components/orrery-hero";
import { ExpandingArrowButton } from "../components/motion/expanding-arrow-button";
import { ButtonLink } from "../components/motion/button/base";
import {
  gutterClassName,
  SiteFrame,
  SiteHeader,
} from "../components/site-frame";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Ascendant - Free Horoscope Calculator" },
      {
        name: "description",
        content:
          "Understand your horoscope with a free Vedic horoscope calculator. Enter your birth date, time, and place to see your ascendant, moon sign, and dashas.",
      },
      {
        property: "og:title",
        content: "Ascendant - Free Horoscope Calculator",
      },
      {
        property: "og:description",
        content:
          "Understand your horoscope with a free Vedic horoscope calculator. Enter your birth date, time, and place to see your ascendant, moon sign, and dashas.",
      },
    ],
  }),
});

const INSTALL_COMMANDS = [
  { runtime: "Bun", command: "bun add astro-ascendant effect" },
  { runtime: "Node", command: "npm install astro-ascendant effect" },
] as const;

/** Router-aware versions: client navigation, preloading and typed routes. */
const ArrowLink = createLink(ExpandingArrowButton);
const BaseLink = createLink(ButtonLink);

const cardClassName =
  "bg-background flex h-full flex-col gap-2 p-5 sm:p-6";

function CardText({
  title,
  description,
  linked = false,
}: {
  title: string;
  description: string;
  linked?: boolean;
}) {
  return (
    <>
      <h3 className="text-foreground flex items-center gap-2 text-sm font-medium sm:text-base">
        {title}
        {linked ? (
          <ArrowRightIcon
            aria-hidden="true"
            className="text-muted-foreground size-4 transition-[translate] duration-(--duration-fast) ease-(--ease-out) motion-safe:group-hover:translate-x-0.5 motion-safe:group-focus-visible:translate-x-0.5"
          />
        ) : null}
      </h3>
      <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
        {description}
      </p>
    </>
  );
}

/** A card that describes something without linking anywhere. */
function PlainCard({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <li className={className}>
      <div className={cardClassName}>
        <CardText title={title} description={description} />
      </div>
    </li>
  );
}

/** A card that links to a docs page by its path under /docs. */
function DocsCard({
  title,
  description,
  page,
  className,
  arrow = false,
}: {
  title: string;
  description: string;
  page: string;
  className?: string;
  arrow?: boolean;
}) {
  return (
    <li className={className}>
      <Link
        to="/docs/$"
        params={{ _splat: page }}
        className={`group hover:bg-card transition-colors duration-150 ease-out ${cardClassName}`}
      >
        <CardText title={title} description={description} linked={arrow} />
      </Link>
    </li>
  );
}

/** Hairline-divided grid: the gap shows the border colour between cards. */
function CardGrid({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  return (
    <ul
      className={`border-border/70 bg-border/70 mt-10 grid gap-px overflow-hidden rounded-xl border ${className}`}
    >
      {children}
    </ul>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
      <h2 className="text-foreground text-2xl font-medium tracking-tight text-balance sm:text-3xl">
        {title}
      </h2>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed text-pretty sm:text-base">
        {subtitle}
      </p>
    </div>
  );
}

function LandingPage() {
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <div aria-hidden="true" className="paper-grain" />

      <SiteFrame>
        <SiteHeader />

        <section
          aria-label="Ascendant horoscope calculator"
          className="section-ticks divide-border grid md:min-h-[38rem] md:grid-cols-2 md:divide-x"
        >
          <div
            className={`flex flex-col items-center justify-center py-14 text-center sm:py-20 md:items-start md:text-left ${gutterClassName}`}
          >
            <h1 className="text-foreground max-w-xl text-4xl font-medium tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Understand your horoscope.
            </h1>
            <p className="text-muted-foreground mt-5 max-w-lg text-base leading-relaxed text-pretty sm:text-lg">
              Unlike the broad and vague magazine horoscopes that only use your{" "}
              <span className="font-serif italic">sun sign</span>, we use a
              complete picture of the sky when and where you were born to
              generate your full horoscope.
            </p>
            <div className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
              <ArrowLink to="/chart" className="w-full sm:w-auto">Create horoscope</ArrowLink>
              <BaseLink to="/docs/$" params={{ _splat: "" }} variant="secondary" size="lg" className="w-full sm:w-auto">
                Read the docs
              </BaseLink>
            </div>
          </div>
          <div
            className={`border-border flex items-center justify-center py-14 max-md:border-t sm:py-20 ${gutterClassName}`}
          >
            <OrreryHero />
          </div>
        </section>

        <section
          className={`section-ticks py-16 sm:py-24 ${gutterClassName}`}
        >
          <SectionHeading
            title="What you get"
            subtitle="The charts, timelines, and scores astrologers read, calculated from your birth date, time, and place."
          />
          <CardGrid className="sm:grid-cols-2 lg:grid-cols-3">
            <PlainCard
              title="Rashi and Varga charts"
              description="Your main birth chart, plus fifteen divisional charts from Hora to Shashtiamsa, Navamsha included"
            />
            <PlainCard
              title="Krishnamurthi Paddhati"
              description="Star lords, sub lords, and the houses each planet signifies"
            />
            <PlainCard
              title="Dashas"
              description="Vimshottari, Chara, and Sthira timelines, with the period you are in now"
            />
            <PlainCard
              title="Jaimini and Sarvashtakavarga"
              description="Karakas, Arudha Pada, and a score for every sign"
            />
            <DocsCard
              title="Ascendant AI Skill"
              description="Send your horoscope to ChatGPT, Claude, or Gemini, or install the skill"
              page="skills"
              className="sm:col-span-2"
              arrow
            />
          </CardGrid>
        </section>

        <section
          className={`section-ticks py-16 sm:py-24 ${gutterClassName}`}
        >
          <SectionHeading
            title="For developers"
            subtitle="Ascendant is also an open-source, Effect-first TypeScript library for sidereal astrology."
          />
          {/* Same groupId as the docs, so the runtime choice carries over. */}
          <Tabs
            items={["Bun", "Node"]}
            groupId="runtime"
            persist
            className="mx-auto mt-8 mb-0 w-full max-w-md"
          >
            {INSTALL_COMMANDS.map(({ runtime, command }) => (
              <Tab key={runtime} value={runtime} keepMounted>
                <DynamicCodeBlock
                  lang="bash"
                  code={command}
                  codeblock={{ className: "my-0" }}
                />
              </Tab>
            ))}
          </Tabs>
          <CardGrid className="sm:grid-cols-2 lg:grid-cols-4">
            <DocsCard
              title="Quickstart"
              description="Calculate your first chart and the dasha running today"
              page="quickstart"
            />
            <DocsCard
              title="Guides"
              description="Settings, divisional charts, dashas, transits, errors, and more"
              page="guides/settings"
            />
            <DocsCard
              title="Skills and plugins"
              description="Analyse saved charts from OpenCode, Claude Code, Codex, and more"
              page="skills"
            />
            <DocsCard
              title="API reference"
              description="Effect services for charts, dashas, and transits"
              page="api-reference/chart"
            />
          </CardGrid>
        </section>

        <section
          className={`section-ticks bg-card/40 flex flex-col items-center py-16 text-center sm:py-24 ${gutterClassName}`}
        >
          <h2 className="text-foreground text-2xl font-medium tracking-tight text-balance sm:text-3xl">
            Create your horoscope today
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed text-pretty sm:text-base">
            Enter a birth date, time, and place. It is free, with nothing
            to install.
          </p>
          <ArrowLink to="/chart" className="mt-8">
            Create horoscope
          </ArrowLink>
        </section>

        <footer
          className={`section-ticks flex w-full justify-center py-8 ${gutterClassName}`}
        >
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
          >
            <span className="text-xs text-muted-foreground">
              © 2026 Laxman K R
            </span>
            <span aria-hidden="true" className="text-xs text-muted-foreground/60">
              •
            </span>
            <a
              href="https://www.gnu.org/licenses/agpl-3.0.html"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
            >
              GNU AGPL v3
            </a>
            <span aria-hidden="true" className="text-xs text-muted-foreground/60">
              •
            </span>
            <Link
              to="/about"
              className="text-xs text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
            >
              About
            </Link>
          </nav>
        </footer>
      </SiteFrame>
    </main>
  );
}

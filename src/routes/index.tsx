import { createFileRoute, Link } from "@tanstack/react-router";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import wordmark from "../../assets/wordmark.webp";
import { OrreryHero } from "../components/orrery-hero";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Free Horoscope Calculator - Ascendant" },
      {
        name: "description",
        content:
          "Understand your horoscope with a free Vedic horoscope calculator. Enter your birth date, time, and place to see your ascendant, moon sign, and dashas.",
      },
      {
        property: "og:title",
        content: "Free Horoscope Calculator - Ascendant",
      },
      {
        property: "og:description",
        content:
          "Understand your horoscope with a free Vedic horoscope calculator. Enter your birth date, time, and place to see your ascendant, moon sign, and dashas.",
      },
    ],
  }),
});

const rowClassName = "group flex flex-wrap items-center gap-2 py-3.5";

function RowText({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <>
      <span className="min-w-0 text-sm font-medium text-foreground sm:text-base">
        {title}
      </span>
      <span
        aria-hidden="true"
        className="hidden shrink-0 text-sm text-muted-foreground sm:inline"
      >
        /
      </span>
      <span className="min-w-0 basis-full text-sm text-muted-foreground transition-colors duration-150 ease-out group-hover:text-foreground sm:basis-auto sm:flex-1">
        {description}
      </span>
    </>
  );
}

/** A row that describes something without linking anywhere. */
function PlainRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <li className={rowClassName}>
      <RowText title={title} description={description} />
    </li>
  );
}

/** A row that links to a docs page by its path under /docs. */
function DocsRow({
  title,
  description,
  page,
}: {
  title: string;
  description: string;
  page: string;
}) {
  return (
    <li>
      <Link
        to="/docs/$"
        params={{ _splat: page }}
        className={rowClassName}
      >
        <RowText title={title} description={description} />
      </Link>
    </li>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="section-tag-ruled text-sm font-medium sm:text-base">
      <span>{children}</span>
      <span className="section-tag-rule" aria-hidden="true" />
    </h2>
  );
}

const headerLinkClassName =
  "text-sm text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground";

function LandingPage() {
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col antialiased">
      <div aria-hidden="true" className="paper-grain" />
      <div className="mx-auto w-full max-w-173 flex-1 px-4 pt-14 lg:max-w-4xl">
        <header className="flex items-center justify-between gap-4">
          <a href="/" aria-label="Ascendant home" className="inline-block">
            <img
              src={wordmark}
              alt="Ascendant"
              width={973}
              height={200}
              className="h-8 w-auto"
            />
          </a>
          <nav aria-label="Primary" className="flex items-center gap-5">
            <Link to="/docs/$" params={{ _splat: "" }} className={headerLinkClassName}>
              Docs
            </Link>
            <a
              href="https://github.com/astro-ascendant"
              target="_blank"
              rel="noreferrer"
              className={headerLinkClassName}
            >
              GitHub
            </a>
          </nav>
        </header>

        <section aria-label="Ascendant horoscope calculator" className="mt-10">
          <div className="grid w-full items-start gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-center">
            <div className="flex flex-col items-start">
              <h1 className="font-sans text-lg font-medium tracking-tight text-foreground sm:text-xl">
                Understand your horoscope.
              </h1>
              <p className="mt-4 max-w-prose text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">
                Unlike the broad and vague magazine horoscopes that only use
                your <span className="font-serif italic">sun sign</span>, we use
                a complete picture of the sky when and where you were born to
                generate your full horoscope.
              </p>
              <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <Link
                  to="/chart"
                  className="bg-primary text-primary-foreground w-fit rounded-lg px-5 py-2 text-sm font-medium transition-transform duration-150 ease-out hover:opacity-90 active:scale-[0.96]"
                >
                  Create Horoscope
                </Link>
              </div>
            </div>

            <div>
              <OrreryHero />
            </div>
          </div>
        </section>

        <section className="mt-16 sm:mt-24">
          <SectionTitle>What you get</SectionTitle>
          <ul className="mt-2 flex flex-col">
            <PlainRow
              title="Rashi and Varga Charts"
              description="Your main birth chart, plus fifteen divisional charts from Hora to Shashtiamsa, Navamsha included"
            />
            <PlainRow
              title="KP Chart"
              description="Star lords, sub lords, and the houses each planet signifies"
            />
            <PlainRow
              title="Dashas"
              description="Vimshottari, Chara, and Sthira timelines, with the period you are in now"
            />
            <PlainRow
              title="Jaimini and Sarvashtakavarga"
              description="Karakas, Arudha Pada, and a score for every sign"
            />
            <DocsRow
              title="Ascendant AI Skill"
              description="Send your chart to ChatGPT, Claude, or Gemini, or install the skill"
              page="skills"
            />
          </ul>
        </section>

        <section className="mt-16 sm:mt-24">
          <SectionTitle>For developers</SectionTitle>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-pretty text-muted-foreground sm:text-base">
            Ascendant is also an open-source, Effect-first TypeScript library for
            sidereal astrology.
          </p>
          <CodeBlock className="mt-4 mb-2">
            <Pre className="px-4">
              <code>bun add astro-ascendant effect</code>
            </Pre>
          </CodeBlock>
          <ul className="mt-2 flex flex-col">
            <DocsRow
              title="Quickstart"
              description="Calculate your first chart and the dasha running today"
              page="quickstart"
            />
            <DocsRow
              title="Guides"
              description="Settings, divisional charts, dashas, transits, errors, and more"
              page="guides/settings"
            />
            <DocsRow
              title="Skills and Plugins"
              description="Analyse saved charts from OpenCode, Claude Code, Codex, and more"
              page="skills"
            />
            <DocsRow
              title="API reference"
              description="Effect services for charts, dashas, and transits"
              page="api-reference/chart"
            />
          </ul>
        </section>
      </div>
      <footer className="mx-auto mt-12 flex w-full max-w-173 justify-center px-4 pb-8 lg:max-w-4xl">
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
    </main>
  );
}

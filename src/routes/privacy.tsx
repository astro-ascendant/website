import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandWordmark } from "@/components/brand-wordmark";
import { saveBirthProfiles } from "@/lib/birth-profiles";
import { deleteAllBirthProfiles } from "@/server/profile.functions";

const DESCRIPTION =
  "What Ascendant stores when you cast a chart, why, for how long, and how to delete it.";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Ascendant - Privacy" },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: "Ascendant - Privacy" },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
});

const linkClassName =
  "font-medium text-foreground underline underline-offset-4 decoration-border transition-colors hover:decoration-foreground";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-serif text-base text-foreground sm:text-lg">
        {title}
      </h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

type DeleteStatus = "idle" | "deleting" | "deleted" | "failed";

const DELETE_MESSAGES: Record<DeleteStatus, string> = {
  idle: "",
  deleting: "Deleting...",
  deleted: "Deleted. Nothing from this browser is stored any more.",
  failed: "That did not work. Please try again in a moment.",
};

function DeleteMyData() {
  const [status, setStatus] = useState<DeleteStatus>("idle");

  const remove = async () => {
    setStatus("deleting");
    try {
      const response = await deleteAllBirthProfiles();
      if (!response.ok) {
        setStatus("failed");
        return;
      }
      saveBirthProfiles([]);
      setStatus("deleted");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={remove}
        disabled={status === "deleting"}
        className="inline-flex h-9 cursor-pointer items-center rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:cursor-default disabled:opacity-60"
      >
        Delete my saved birth details
      </button>
      <p role="status" aria-live="polite" className="text-xs">
        {DELETE_MESSAGES[status]}
      </p>
    </div>
  );
}

function PrivacyPage() {
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col items-center px-6 py-20 antialiased selection:bg-selection-highlight selection:text-foreground">
      <div aria-hidden="true" className="paper-grain" />

      <article className="mx-auto flex w-full max-w-xl flex-col gap-8 sm:gap-10">
        <header className="flex flex-col items-center gap-2 text-center">
          <Link
            to="/"
            aria-label="Ascendant home"
            className="inline-block transition-opacity duration-150 ease-out hover:opacity-80 active:scale-[0.98]"
          >
            <BrandWordmark className="h-9 sm:h-11" />
          </Link>
          <h1 className="text-xs text-muted-foreground sm:text-sm">
            Privacy Policy
          </h1>
          <p className="text-xs text-muted-foreground">
            Last updated 16 November 2026
          </p>
        </header>

        <Section title="What we store">
          <p>
            Every time you cast a chart on the{" "}
            <Link to="/chart" className={linkClassName}>
              chart page
            </Link>
            , we save the birth details you entered: the name, birth date, birth
            time, place with its latitude and longitude, and sex if you gave
            one. The sky page does not save anything.
          </p>
          <p>
            Your browser also keeps the charts you cast under a name, so the
            name field can offer them again.
          </p>
        </Section>

        <Section title="How it is linked to you">
          <p>
            There are no accounts. The first chart you cast sets a random,
            anonymous id in a cookie named <code>ascendant_owner</code>. Your
            birth details are stored under that id, and only a request carrying
            the same cookie can list or delete them. The cookie lasts a year
            from your latest chart. We do not store your IP address or link the
            id to anything else.
          </p>
        </Section>

        <Section title="Why">
          <p>
            So the people you look up are there again on your next visit, even
            after your browser clears its storage. We do not sell or share these
            details, and we do not use them for advertising.
          </p>
        </Section>

        <Section title="Where it is kept">
          <p>
            In a Postgres database hosted by Neon, reached from the site's
            servers on Vercel.
          </p>
          <p>
            Two other services see some of what you type, only when you use
            them: OpenStreetMap's Nominatim receives the place you search for,
            and the AI button sends your chart to the assistant you pick.
          </p>
        </Section>

        <Section title="How long">
          <p>
            Until you delete it. Deleting removes every chart this browser has
            cast from our database and from your browser at once.
          </p>
        </Section>

        <Section title="Delete your data">
          <p>
            This deletes everything stored for this browser. To ask about data
            cast from a browser you no longer have, contact the author named on
            the{" "}
            <Link to="/about" className={linkClassName}>
              About page
            </Link>
            .
          </p>
          <DeleteMyData />
        </Section>
      </article>
    </main>
  );
}

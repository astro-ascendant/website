import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandWordmark } from "@/components/brand-wordmark";
import { saveBirthProfiles } from "@/lib/birth-profiles";
import { deleteAllBirthProfiles } from "@/server/profile.functions";

const DESCRIPTION =
  "What Ascendant saves when you create a horoscope, why, who sees it, and how to delete it.";

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
  deleted: "Done. Nothing from this browser is saved any more.",
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
        className={`${linkClassName} cursor-pointer text-sm disabled:cursor-default disabled:opacity-60`}
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
            Last updated 24 November 2026
          </p>
        </header>

        <Section title="What we save">
          <p>
            When you create a horoscope on the{" "}
            <Link to="/chart" className={linkClassName}>
              chart page
            </Link>
            , we save the birth details you enter: the name, the date, time and
            place of birth, and gender if you choose one. Looking at the sky
            page saves nothing.
          </p>
        </Section>

        <Section title="Why">
          <p>
            So the people you have looked up are ready for you next time. We
            never sell your details, share them with advertisers, or use them
            for ads.
          </p>
        </Section>

        <Section title="Who can see it">
          <p>
            Only you, from this browser. There are no accounts, and we never
            ask who you are.
          </p>
          <p>
            Two things leave the site only when you use them: the place you
            search for is looked up with a map service, and a chart you send to
            an AI assistant goes to the assistant you pick.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>Until you delete it.</p>
        </Section>

        <Section title="Delete your details">
          <p>
            This removes every chart saved from this browser, straight away. If
            you no longer have the browser you used, contact the author named
            on the{" "}
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

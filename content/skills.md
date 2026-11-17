---
title: Skills and plugins
description: Install the Ascendant plugins for OpenCode, Claude Code, and Codex, or the skill for any other agent.
---

**Ascendant** saves a birth chart once, then answers astrology questions from
that stored record instead of recalled positions. It runs as an agent skill in
OpenCode, Claude Code, Codex, and any skill-compatible agent.

## Workflow

1. **Save a chart.** Give a person's birth data. The skill writes a record to
   `persons/<name>/` and generates the Vedic and KP charts, dashas, and
   Ashtakavarga its answers draw on. The birth header is immutable, and
   confirmed past events accumulate in the record's `MEMORY.md`.
2. **Ask a question.** Ask in plain words. The reply leads with the judgment,
   then shows the method and citations.

## Schools

Each answer commits to one school. **KP** (KrishnamurtiVP291, Placidus,
Vimshottari) is the default for every question. **Parashari** (Lahiri,
whole-sign, Vimshottari) applies only on explicit request, and covers promise,
quality, yogas, and divisional charts. The two never mix. Each answer states
its school, ayanamsa, house system, and dasha system up front.

## Rules

Three rules keep readings consistent:

- **Cited evidence**: every claim points to a chart file (`path:field`) and a
  guidebook section, so judgments trace to the record, not memory.
- **One method per judgment**: KP placements are never read with Parashari
  rules.
- **No hedging**: when evidence is missing or conflicts block judgment, the
  skill returns `Insufficient evidence: run init or attach X`.

The skill declines to time or assert deaths, serious accidents, or severe
illnesses.

## Install

### Any agent

One command for any skill-compatible agent. Run it from the working directory
where you want to use Ascendant:

```bash
npx ascendant-skills install
```

### OpenCode

```bash
opencode plugin add opencode-ascendant
```

### Claude Code

Run these inside Claude Code:

```text
/plugin marketplace add astro-ascendant/skills
/plugin install ascendant@ascendant
/reload-plugins
```

### Codex

```bash
codex plugin marketplace add astro-ascendant/skills --ref main
codex plugin add ascendant@ascendant
```

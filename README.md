<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/brand/wordmark-white.svg" />
    <img src="assets/brand/wordmark.svg" alt="Ascendant" width="360" />
  </picture>
</p>

This site is the TypeScript documentation for Ascendant: a library for sidereal
astrology on npm as `astro-ascendant`. You can calculate charts, dashas, yogas,
Ashtakavarga, and Jaimini results, and you can use those results with coding
agents.

Python has its own docs in the
[ascendant repo](https://github.com/astro-ascendant/ascendant/tree/main/docs/content).

## What you can learn

- How Ascendant calculates a chart, and which defaults it uses
- The difference between signs, houses, charts, and timing
- How Parashari, Jaimini, and KP approaches differ
- How saved person records work with agent skills
- How to install the TypeScript library and choose calculation settings
- What a reading can and cannot claim

## How calculations work

By default Ascendant uses the sidereal zodiac, KrishnamurtiVP291 ayanamsa, and
Placidus houses.

Methods are named so you can check and repeat a result. A reading is guidance,
not certainty, and not a substitute for medical, legal, or financial advice.

## Docs

- [Getting started](content/index.mdx) and [Quickstart](content/quickstart.mdx)
- [Core concepts](content/concepts.mdx)
- [Build with an agent](content/agents.mdx)
- [Skills and plugins](content/skills.md)
- Developer guides in [content/guides](content/guides)
- API reference: [Chart](content/api-reference/chart.mdx),
  [Dasha](content/api-reference/dasha.mdx), [SAV](content/api-reference/sav.mdx),
  [Jaimini](content/api-reference/jaimini.mdx),
  [Ephemeris](content/api-reference/ephemeris.mdx),
  [AstroParams](content/api-reference/astro-params.mdx),
  [Swisseph](content/api-reference/swisseph.mdx)

## Contributing

See [CONTRIBUTION.md](CONTRIBUTION.md).

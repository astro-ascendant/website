"""Builds the site's Allo web fonts from the allo-font package.

The package's variable font is 448 KB because it carries every script Allo
draws and a roundness axis the site never changes. This pins roundness at its
default (50), keeps weight and optical size, and splits the result by
unicode-range, so a page downloads only the subsets its text uses:

  allo-latin.woff2      Basic Latin, Latin-1, punctuation: nearly every page
  allo-latin-ext.woff2  IAST diacritics (a with macron, s with dot below, ...)
  allo-full.woff2       everything else, the fallback for rare characters

The obliques are static per weight; each is cut to Latin and Latin Extended.

It also prints the metric overrides for the "Allo Fallback" face in app.css,
which sizes Arial to Allo so the swap on load does not shift the layout.

Run after updating allo-font (needs fonttools and brotli):

  python -m pip install fonttools brotli
  python scripts/build-fonts.py
"""

from io import BytesIO
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "node_modules/allo-font/fonts/webfonts"
OUT = ROOT / "assets/fonts/allo"

# Google Fonts' ranges, so the split matches what browsers are tuned for.
LATIN = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,"
    "U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,"
    "U+FEFF,U+FFFD"
)
LATIN_EXT = (
    "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,"
    "U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,"
    "U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"
)

OBLIQUES = {
    100: "Thin",
    200: "ExtraLight",
    300: "Light",
    400: "",
    500: "Medium",
    600: "SemiBold",
    700: "Bold",
    800: "ExtraBold",
    900: "Black",
}


def codepoints(ranges: str) -> set[int]:
    points: set[int] = set()
    for part in ranges.split(","):
        lo, _, hi = part.removeprefix("U+").partition("-")
        points.update(range(int(lo, 16), int(hi or lo, 16) + 1))
    return points


def options() -> Options:
    o = Options()
    o.flavor = "woff2"
    # The default shaping features plus the numeric and case ones CSS can ask
    # for (font-variant-numeric, text-transform). The ssXX and cvXX alternates
    # are dropped: the site uses none, and they add a glyph set each.
    o.layout_features += [
        "tnum", "pnum", "lnum", "zero", "frac", "numr", "dnom",
        "ordn", "sups", "subs", "sinf", "case",
    ]
    o.name_IDs = ["*"]
    o.notdef_outline = True
    o.hinting = False  # browsers ignore TrueType hints on these sizes
    o.drop_tables += ["DSIG"]
    return o


def cut(font_path: Path, unicodes: set[int] | None, out: Path, pin_round=False):
    font = TTFont(font_path)
    if pin_round and "fvar" in font:
        # Round-trip the instance, as the subsetter trips on its lazy tables.
        buffer = BytesIO()
        instantiateVariableFont(font, {"ROND": 50}).save(buffer)
        buffer.seek(0)
        font = TTFont(buffer)
    if unicodes is not None:
        subsetter = Subsetter(options())
        subsetter.populate(unicodes=unicodes)
        subsetter.subset(font)
    else:
        font.flavor = "woff2"
    font.save(out)
    print(f"{out.name:32} {out.stat().st_size / 1024:6.0f} KB")


def metrics(font_path: Path, label: str) -> dict[str, float]:
    font = TTFont(font_path)
    upm = font["head"].unitsPerEm
    os2, hhea = font["OS/2"], font["hhea"]
    use_typo = bool(os2.fsSelection & (1 << 7))
    ascent = os2.sTypoAscender if use_typo else hhea.ascent
    descent = os2.sTypoDescender if use_typo else hhea.descent
    gap = os2.sTypoLineGap if use_typo else hhea.lineGap
    # English letter frequencies, as next/font weights its average width.
    sample = "etaoinshrdlucmfwypvbgkjqxz ETAOINSHRDLUCMFWYPVBGKJQXZ"
    cmap, hmtx = font.getBestCmap(), font["hmtx"]
    widths = [hmtx[cmap[ord(c)]][0] for c in sample if ord(c) in cmap]
    return {
        "upm": upm,
        "ascent": ascent / upm,
        "descent": abs(descent) / upm,
        "gap": gap / upm,
        "width": sum(widths) / len(widths) / upm,
        "label": label,
    }


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    variable = SOURCE / "AlloVariable.woff2"
    cut(variable, codepoints(LATIN), OUT / "allo-latin.woff2", pin_round=True)
    cut(variable, codepoints(LATIN_EXT), OUT / "allo-latin-ext.woff2", pin_round=True)
    cut(variable, None, OUT / "allo-full.woff2", pin_round=True)
    both = codepoints(LATIN) | codepoints(LATIN_EXT)
    for weight, name in OBLIQUES.items():
        src = SOURCE / f"Allo-{name}Oblique.woff2"
        cut(src, both, OUT / f"allo-oblique-{weight}.woff2")

    allo = metrics(OUT / "allo-latin.woff2", "Allo")
    arial_path = Path("C:/Windows/Fonts/arial.ttf")
    for candidate in (arial_path, Path("/Library/Fonts/Arial.ttf"), Path("/usr/share/fonts/truetype/msttcorefonts/Arial.ttf")):
        if candidate.exists():
            arial = metrics(candidate, "Arial")
            size = allo["width"] / arial["width"]
            print("\nAllo Fallback overrides (Arial):")
            print(f"  size-adjust: {size * 100:.2f}%;")
            print(f"  ascent-override: {allo['ascent'] / size * 100:.2f}%;")
            print(f"  descent-override: {allo['descent'] / size * 100:.2f}%;")
            print(f"  line-gap-override: {allo['gap'] / size * 100:.2f}%;")
            break


if __name__ == "__main__":
    main()

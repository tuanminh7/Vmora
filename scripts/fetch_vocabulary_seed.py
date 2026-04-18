from __future__ import annotations

import argparse
import gzip
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Callable


ROOT_DIR = Path(__file__).resolve().parents[1]
NORMALIZED_DIR = ROOT_DIR / "data" / "normalized"
OUTPUT_FILE = NORMALIZED_DIR / "vocabulary_seed.json"


SOURCES = {
    "en": {
        "language_name": "English",
        "source_name": "Kaikki",
        "source_url": "https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl",
        "fetcher": "kaikki",
    },
    "de": {
        "language_name": "German",
        "source_name": "Kaikki",
        "source_url": "https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl",
        "fetcher": "kaikki",
    },
    "ko": {
        "language_name": "Korean",
        "source_name": "Kaikki",
        "source_url": "https://kaikki.org/dictionary/Korean/kaikki.org-dictionary-Korean.jsonl",
        "fetcher": "kaikki",
    },
    "ja": {
        "language_name": "Japanese",
        "source_name": "JMdict",
        "source_url": "http://ftp.edrdg.org/pub/Nihongo/JMdict_e.gz",
        "fetcher": "jmdict",
    },
    "zh": {
        "language_name": "Chinese",
        "source_name": "CC-CEDICT",
        "source_url": "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz",
        "fetcher": "cedict",
    },
}


def clean_text(value: str | None) -> str | None:
    if not value:
        return None
    return re.sub(r"\s+", " ", value).strip()


def pick_glosses(glosses: list[str] | None) -> str | None:
    if not glosses:
        return None
    cleaned = [clean_text(gloss) for gloss in glosses if clean_text(gloss)]
    if not cleaned:
        return None
    return "; ".join(cleaned[:3])


def pick_romanization(entry: dict) -> str | None:
    for form in entry.get("forms", []):
        tags = {tag.lower() for tag in form.get("tags", [])}
        if "romanization" in tags or "romanized" in tags:
            return clean_text(form.get("form"))

    for sound in entry.get("sounds", []):
        roman = clean_text(sound.get("roman"))
        if roman:
            return roman

    return None


def normalize_kaikki_entry(language_code: str, source: dict, entry: dict) -> dict | None:
    word = clean_text(entry.get("word"))
    if not word:
        return None

    pos = clean_text(entry.get("pos"))
    gloss = None
    for sense in entry.get("senses", []):
        gloss = pick_glosses(sense.get("glosses"))
        if gloss:
            break

    if not gloss:
        return None

    return {
        "language_code": language_code,
        "language_name": source["language_name"],
        "word": word,
        "reading": pick_romanization(entry),
        "part_of_speech": pos,
        "meaning_en": gloss,
        "meaning_vi": None,
        "example": None,
        "example_meaning_vi": None,
        "source_name": source["source_name"],
        "source_url": source["source_url"],
    }


def fetch_kaikki(language_code: str, source: dict, limit: int) -> list[dict]:
    records: list[dict] = []
    request = urllib.request.Request(source["source_url"], headers={"User-Agent": "Vmora/0.1"})

    with urllib.request.urlopen(request, timeout=120) as response:
        for raw_line in response:
            if len(records) >= limit:
                break

            raw_line = raw_line.strip()
            if not raw_line:
                continue

            entry = json.loads(raw_line.decode("utf-8"))
            normalized = normalize_kaikki_entry(language_code, source, entry)
            if normalized:
                records.append(normalized)

    return records


def fetch_jmdict(language_code: str, source: dict, limit: int) -> list[dict]:
    records: list[dict] = []
    request = urllib.request.Request(source["source_url"], headers={"User-Agent": "Vmora/0.1"})

    with urllib.request.urlopen(request, timeout=120) as response:
        with gzip.GzipFile(fileobj=response) as gz_file:
            context = ET.iterparse(gz_file, events=("end",))
            for _, elem in context:
                if elem.tag != "entry":
                    continue

                if len(records) >= limit:
                    break

                keb = elem.findtext("./k_ele/keb")
                reb = elem.findtext("./r_ele/reb")
                first_sense = elem.find("./sense")
                if first_sense is None:
                    elem.clear()
                    continue

                glosses = [gloss.text for gloss in first_sense.findall("./gloss") if gloss.text]
                pos = first_sense.findtext("./pos")
                word = clean_text(keb or reb)
                gloss = pick_glosses(glosses)

                if word and gloss:
                    records.append(
                        {
                            "language_code": language_code,
                            "language_name": source["language_name"],
                            "word": word,
                            "reading": clean_text(reb if keb else None),
                            "part_of_speech": clean_text(pos),
                            "meaning_en": gloss,
                            "meaning_vi": None,
                            "example": None,
                            "example_meaning_vi": None,
                            "source_name": source["source_name"],
                            "source_url": source["source_url"],
                        }
                    )

                elem.clear()

    return records


CEDICT_PATTERN = re.compile(r"^(?P<trad>\S+)\s+(?P<simp>\S+)\s+\[(?P<pinyin>.+?)\]\s+/(?P<gloss>.+)/$")


def fetch_cedict(language_code: str, source: dict, limit: int) -> list[dict]:
    records: list[dict] = []
    request = urllib.request.Request(source["source_url"], headers={"User-Agent": "Vmora/0.1"})

    with urllib.request.urlopen(request, timeout=120) as response:
        with gzip.GzipFile(fileobj=response) as gz_file:
            for raw_line in gz_file:
                if len(records) >= limit:
                    break

                line = raw_line.decode("utf-8", errors="ignore").strip()
                if not line or line.startswith("#"):
                    continue

                match = CEDICT_PATTERN.match(line)
                if not match:
                    continue

                gloss_parts = [clean_text(part) for part in match.group("gloss").split("/") if clean_text(part)]
                gloss = pick_glosses(gloss_parts)
                if not gloss:
                    continue

                records.append(
                    {
                        "language_code": language_code,
                        "language_name": source["language_name"],
                        "word": clean_text(match.group("simp")),
                        "reading": clean_text(match.group("pinyin")),
                        "part_of_speech": None,
                        "meaning_en": gloss,
                        "meaning_vi": None,
                        "example": None,
                        "example_meaning_vi": None,
                        "source_name": source["source_name"],
                        "source_url": source["source_url"],
                    }
                )

    return records


FETCHERS: dict[str, Callable[[str, dict, int], list[dict]]] = {
    "kaikki": fetch_kaikki,
    "jmdict": fetch_jmdict,
    "cedict": fetch_cedict,
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit-per-language", type=int, default=50)
    parser.add_argument("--languages", nargs="*", help="Chi fetch cac ngon ngu duoc chon, vi du: en zh")
    args = parser.parse_args()

    NORMALIZED_DIR.mkdir(parents=True, exist_ok=True)

    all_records: list[dict] = []
    selected_languages = set(args.languages) if args.languages else set(SOURCES.keys())
    for language_code, source in SOURCES.items():
        if language_code not in selected_languages:
            continue
        fetcher = FETCHERS[source["fetcher"]]
        records = fetcher(language_code, source, args.limit_per_language)
        all_records.extend(records)

    OUTPUT_FILE.write_text(
        json.dumps(all_records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Wrote {len(all_records)} records")


if __name__ == "__main__":
    main()

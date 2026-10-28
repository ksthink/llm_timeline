#!/usr/bin/env python3
"""data/models.csv 를 src/data/models.json 으로 바꿉니다."""

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "models.csv"
DEST = ROOT / "src" / "data" / "models.json"

LANDMARKS = {
    "AlphaGo (이세돌 대국)",
    "Transformer",
    "BERT",
    "GPT-2",
    "GPT-3",
    "CLIP",
    "DALL·E",
    "HyperCLOVA",
    "Stable Diffusion",
    "ChatGPT (GPT-3.5)",
    "LLaMA",
    "GPT-4",
    "Sora (발표)",
    "Gemini 1.5 Pro",
    "Claude 3",
    "EXAONE 3.0",
    "DeepSeek-R1",
}

OPENNESS = {"오픈웨이트", "오픈", "오픈(코드)", "비공개", "미확인"}


def clean(value):
    return (value or "").strip()


def main():
    with SRC.open(encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    models = []
    for index, row in enumerate(rows):
        name = clean(row["모델명"])
        openness = clean(row["오픈여부"])
        if openness not in OPENNESS:
            raise SystemExit(f"알 수 없는 오픈여부: {name} / {openness}")
        models.append(
            {
                "id": index,
                "date": clean(row["출시일"]),
                "name": name,
                "company": clean(row["회사"]),
                "field": clean(row["분야"]),
                "openness": openness,
                "hf": clean(row["허깅페이스URL"]),
                "official": clean(row["공식페이지URL"]),
                "summary": clean(row["한줄설명"]),
                "source": clean(row["출처URL"]),
                "country": clean(row["국가"]),
                "notes": clean(row["notes"]),
                "verify": clean(row["verify_status"]),
                "evidence": clean(row["evidence"]),
                "pageStatus": clean(row["page_status"]),
                "archive": clean(row["archive_url"]),
                "landmark": name in LANDMARKS,
            }
        )

    found = {model["name"] for model in models if model["landmark"]}
    missing = LANDMARKS - found
    if missing:
        raise SystemExit(f"이정표 이름을 찾지 못했습니다: {sorted(missing)}")

    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(
        json.dumps({"models": models}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{len(models)} models, {len(found)} landmarks -> {DEST}")


if __name__ == "__main__":
    main()

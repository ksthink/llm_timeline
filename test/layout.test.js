import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  COLOR_END,
  COLOR_START,
  contrastRatio,
  eraOf,
  filterModels,
  readableOnDark,
  usableUrl,
  yearCards,
  yearColor,
} from "../src/layout.js";
import { logoFor } from "../src/logos.js";

const payload = JSON.parse(
  await readFile(new URL("../src/data/models.json", import.meta.url), "utf8"),
);
const cards = yearCards(payload.models);

test("2015년부터 2026년까지 연도 카드 12장에 283개 모델이 들어간다", () => {
  assert.equal(cards.length, 12);
  assert.equal(cards[0].year, 2015);
  assert.equal(cards.at(-1).year, 2026);
  assert.equal(cards.reduce((sum, card) => sum + card.models.length, 0), 283);
  for (const card of cards) assert.ok(card.models.length > 0, String(card.year));
});

test("대표 모델은 이정표이고, 같은 해의 나머지는 불릿으로 줄인다", () => {
  const card2017 = cards.find((card) => card.year === 2017);
  const card2022 = cards.find((card) => card.year === 2022);
  const card2025 = cards.find((card) => card.year === 2025);
  assert.equal(card2017.lead.name, "Transformer");
  assert.equal(card2022.lead.name, "Stable Diffusion");
  assert.ok(card2022.lines.some((line) => line.includes("ChatGPT")));
  assert.equal(card2025.lead.name, "DeepSeek-R1");
  assert.equal(card2025.models.length, 79);
  assert.ok(card2025.lines.at(-1).includes("외 75건"));
  assert.equal(cards.find((card) => card.year === 2015).lines.length, 0);
});

test("점 색은 노랑에서 초록으로 이동하고 시대가 비지 않는다", () => {
  assert.equal(yearColor(0, 12).toLowerCase(), COLOR_START.toLowerCase());
  assert.equal(yearColor(11, 12).toLowerCase(), COLOR_END.toLowerCase());
  const reds = cards.map((card) => parseInt(card.color.slice(1, 3), 16));
  assert.ok(reds.at(-1) < reds[0]);
  for (let year = 2015; year <= 2026; year += 1) assert.ok(eraOf(year));
});

test("연도 글자는 어두운 배경과 구분된다", () => {
  for (let index = 0; index < 12; index += 1) {
    const ink = readableOnDark(yearColor(index, 12));
    assert.ok(contrastRatio(ink, "#444444") >= 4.5, ink);
  }
  assert.equal(readableOnDark(COLOR_START).toLowerCase(), COLOR_START.toLowerCase());
  assert.notEqual(readableOnDark(COLOR_END).toLowerCase(), COLOR_END.toLowerCase());
});

test("국가와 모델 이름으로 함께 거른다", () => {
  assert.equal(filterModels(payload.models, {}).length, 283);
  assert.equal(filterModels(payload.models, { country: "한국" }).length, 31);
  const exaone = filterModels(payload.models, { country: "한국", model: "exaone" });
  assert.ok(exaone.length > 0);
  assert.ok(exaone.every((model) => model.country === "한국" && /exaone/i.test(model.name)));
  const gpt4 = filterModels(payload.models, { model: "GPT-4" });
  assert.ok(gpt4.some((model) => model.name === "GPT-4"));
  assert.equal(filterModels(payload.models, { country: "한국", model: "GPT-4" }).length, 0);
});

test("회사 로고는 알려진 회사와 그 밖을 모두 그린다", () => {
  const openai = logoFor("OpenAI");
  const monogram = logoFor("Upstage");
  assert.match(openai.src, /^data:image\/svg\+xml/);
  assert.match(openai.srcBrand, /%23/);
  assert.equal(openai.label, "OpenAI");
  assert.match(monogram.src, /^data:image\/svg\+xml/);
  assert.match(decodeURIComponent(monogram.src), /UP/);
  assert.match(logoFor("Google DeepMind").srcBrand, /%23/);
  assert.notEqual(logoFor("Google DeepMind").label, logoFor("Google").label);
});

test("빈 주소와 실제 주소를 가른다", () => {
  assert.equal(usableUrl("해당없음"), "");
  assert.equal(usableUrl("미확인"), "");
  assert.equal(usableUrl("https://arxiv.org/abs/1706.03762"), "https://arxiv.org/abs/1706.03762");
});

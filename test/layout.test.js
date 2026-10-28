import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ERAS,
  LANE,
  appearance,
  eraOf,
  labelFor,
  matches,
  parseRelease,
  usableUrl,
  waveY,
} from "../src/layout.js";

const payload = JSON.parse(
  await readFile(new URL("../src/data/models.json", import.meta.url), "utf8"),
);
const models = payload.models;

const LANDMARKS = [
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
];

test("283개 모델이 모두 시대와 레인에 들어간다", () => {
  assert.equal(models.length, 283);
  for (const model of models) {
    const view = appearance(model);
    assert.ok(view.era, model.date);
    assert.ok(view.year >= 2015 && view.year <= 2026, model.date);
    if (view.lane > 0) assert.ok(view.y > view.wave + 0.4, model.name);
    if (view.lane < 0) assert.ok(view.y < view.wave - 0.4, model.name);
    if (view.lane === 0) assert.ok(Math.abs(view.y - view.wave) < 0.2, model.name);
  }
});

test("공개 레인은 오픈 140, 비공개 140, 미확인 3이다", () => {
  assert.equal(models.filter((model) => LANE[model.openness] === 1).length, 140);
  assert.equal(models.filter((model) => LANE[model.openness] === -1).length, 140);
  assert.equal(models.filter((model) => LANE[model.openness] === 0).length, 3);
});

test("이정표 17개가 데이터에 있다", () => {
  const names = models.filter((model) => model.landmark).map((model) => model.name).sort();
  assert.deepEqual(names, [...LANDMARKS].sort());
});

test("한국 모델 31건만 국가 필터에 남는다", () => {
  assert.equal(models.filter((model) => matches(model, { country: "한국" })).length, 31);
  assert.equal(models.filter((model) => matches(model, { field: "언어", lane: "open" })).length,
    models.filter((model) => model.field === "언어" && LANE[model.openness] === 1).length);
});

test("전체 기간에서는 이정표 숫자만 보이고, 좁히면 이름이 붙는다", () => {
  const landmark = models.find((model) => model.name === "BERT");
  const other = models.find((model) => !model.landmark);
  assert.equal(labelFor(landmark, 2000, -1).text, "1810");
  assert.equal(labelFor(landmark, 400, -1).show, true);
  assert.match(labelFor(landmark, 400, -1).text, /BERT/);
  assert.equal(labelFor(other, 2000, -1).show, false);
  assert.equal(labelFor(other, 100, -1).show, true);
  assert.equal(labelFor(other, 2000, other.id).show, true);
});

test("시대는 2015년부터 2026년까지 빠지지 않는다", () => {
  for (let year = 2015; year <= 2026; year += 1) {
    assert.ok(eraOf(year), String(year));
  }
  assert.equal(ERAS.length, 5);
});

test("출시일과 링크를 읽는다", () => {
  assert.equal(new Date(parseRelease("2015-10")).getUTCMonth(), 9);
  assert.equal(new Date(parseRelease("2015-10")).getUTCDate(), 15);
  assert.equal(new Date(parseRelease("2016-03-09")).getUTCDate(), 9);
  assert.equal(usableUrl("해당없음"), "");
  assert.equal(usableUrl("미확인"), "");
  assert.equal(usableUrl("https://arxiv.org/abs/1706.03762"), "https://arxiv.org/abs/1706.03762");
  assert.ok(Math.abs(waveY(Date.UTC(2014, 10, 1))) < 1e-9);
});

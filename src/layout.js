/** 연도 카드. JointJS 다이어그램과 분리해 둔다. */

export const YEAR_MIN = 2015;
export const YEAR_MAX = 2026;
export const COLOR_START = "#F4F269";
export const COLOR_END = "#4DA562";

export const ERAS = [
  { id: "foundation", name: "기반", start: 2015, end: 2017 },
  { id: "pretrain", name: "사전학습", start: 2018, end: 2020 },
  { id: "generate", name: "생성", start: 2021, end: 2022 },
  { id: "compete", name: "경쟁", start: 2023, end: 2024 },
  { id: "reason", name: "추론", start: 2025, end: 2026 },
];

const NAMED_BULLETS = 3;

export function releaseYear(date) {
  const year = Number(String(date).slice(0, 4));
  if (!year) throw new Error(`출시일을 읽을 수 없습니다: ${date}`);
  return year;
}

export function eraOf(year) {
  return ERAS.find((era) => year >= era.start && year <= era.end) ?? null;
}

export function lerpHex(start, end, t) {
  const from = hexChannels(start);
  const to = hexChannels(end);
  const channels = from.map((value, index) => Math.round(value + (to[index] - value) * t));
  return `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function yearColor(index, count) {
  const t = count <= 1 ? 0 : index / (count - 1);
  return lerpHex(COLOR_START, COLOR_END, t);
}

export function shadeHexColor(color, percent) {
  const channels = hexChannels(color);
  const target = percent < 0 ? 0 : 255;
  const amount = percent < 0 ? -percent : percent;
  const mixed = channels.map((value) => Math.round((target - value) * amount) + value);
  return `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function linearChannel(value) {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground, background) {
  const luminance = (color) => {
    const [red, green, blue] = hexChannels(color);
    return 0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue);
  };
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

/** 어두운 보드 위 연도 글자. 점 색은 그대로 두고, 글자만 대비가 날 때까지 밝힌다. */
export function readableOnDark(color, background = "#444444") {
  let current = color;
  for (let step = 0; step < 16; step += 1) {
    if (contrastRatio(current, background) >= 4.5) return current;
    current = shadeHexColor(current, 0.1);
  }
  return "#ffffff";
}

function hexChannels(color) {
  const value = parseInt(color.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function filterModels(models, { country = "", model = "" } = {}) {
  const query = model.trim().toLocaleLowerCase("en");
  return models.filter((item) => {
    if (country && item.country !== country) return false;
    if (query && !item.name.toLocaleLowerCase("en").includes(query)) return false;
    return true;
  });
}

export function usableUrl(value) {
  const text = (value || "").trim();
  if (!text || text === "해당없음" || text === "미확인") return "";
  if (!/^https?:\/\//i.test(text)) return "";
  return text;
}

function othersAfter(lead, models) {
  return models.filter((model) => model !== lead);
}

export function yearCards(models) {
  const cards = [];
  for (let year = YEAR_MIN; year <= YEAR_MAX; year += 1) {
    const rows = models.filter((model) => releaseYear(model.date) === year);
    const lead = rows.find((model) => model.landmark) ?? rows[0] ?? null;
    const others = lead ? othersAfter(lead, rows) : [];
    const named = [];
    const ordered = [...others.filter((model) => model.landmark), ...others.filter((model) => !model.landmark)];
    for (const model of ordered) {
      if (named.length >= NAMED_BULLETS) break;
      named.push(model.name);
    }
    const hidden = others.length - named.length;
    const lines = named.map((name) => `● ${name}`);
    if (hidden > 0) lines.push(`● 외 ${hidden}건`);
    cards.push({
      year,
      color: yearColor(cards.length, YEAR_MAX - YEAR_MIN + 1),
      era: eraOf(year),
      lead,
      lines,
      models: rows,
    });
  }
  return cards;
}

/** 타임라인 좌표. 차트 라이브러리와 분리해 두고 테스트한다. */

export const ERAS = [
  { id: "foundation", label: "2015–2017", name: "기반", start: 2015, end: 2017, color: "#E8893A" },
  { id: "pretrain", label: "2018–2020", name: "사전학습", start: 2018, end: 2020, color: "#C45C4A" },
  { id: "generate", label: "2021–2022", name: "생성", start: 2021, end: 2022, color: "#C6A15B" },
  { id: "compete", label: "2023–2024", name: "경쟁", start: 2023, end: 2024, color: "#D07A4A" },
  { id: "reason", label: "2025–2026", name: "추론", start: 2025, end: 2026, color: "#6A9BB5" },
];

/** 오픈 계열은 파도 위, 비공개는 파도 아래, 미확인은 파도 위. */
export const LANE = {
  오픈웨이트: 1,
  오픈: 1,
  "오픈(코드)": 1,
  비공개: -1,
  미확인: 0,
};

export const AXIS_START = Date.UTC(2014, 10, 1);
export const AXIS_END = Date.UTC(2027, 2, 1);

/** 이 일수보다 좁히면 이정표 이름이 붙고, 더 좁히면 나머지 모델 이름도 붙는다. */
export const LANDMARK_NAME_SPAN_DAYS = 900;
export const ALL_NAME_SPAN_DAYS = 400;
export const MONTH_AXIS_SPAN_DAYS = 800;

const WAVE_AMP = 0.52;
const LANE_GAP = 0.78;
const JITTER = 0.26;

export function parseRelease(dateStr) {
  const [yearText, monthText, dayText] = dateStr.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = dayText ? Number(dayText) : 15;
  if (!year || !month || !day) {
    throw new Error(`출시일을 읽을 수 없습니다: ${dateStr}`);
  }
  return Date.UTC(year, month - 1, day);
}

export function timeNorm(timestamp) {
  return (timestamp - AXIS_START) / (AXIS_END - AXIS_START);
}

/** 왼쪽 끝과 오른쪽 끝이 0인 사인파. 한 주기당 위·아래 아치가 하나씩이다. */
export function waveY(timestamp) {
  return Math.sin(timeNorm(timestamp) * Math.PI * 8) * WAVE_AMP;
}

function hashUnit(text) {
  let hash = 2166136261;
  for (const char of text) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function pointY(model) {
  const timestamp = parseRelease(model.date);
  const lane = LANE[model.openness];
  if (lane === undefined) {
    throw new Error(`오픈여부를 배치할 수 없습니다: ${model.openness}`);
  }
  const spread = lane === 0 ? 0.1 : JITTER;
  const jitter = (hashUnit(`${model.name}|${model.date}`) * 2 - 1) * spread;
  return waveY(timestamp) + lane * (lane === 0 ? 0 : LANE_GAP) + jitter;
}

export function eraOf(year) {
  return ERAS.find((era) => year >= era.start && year <= era.end) ?? null;
}

export function eraForTimestamp(timestamp) {
  const year = new Date(timestamp).getUTCFullYear();
  if (year < ERAS[0].start) return ERAS[0];
  if (year > ERAS[ERAS.length - 1].end) return ERAS[ERAS.length - 1];
  return eraOf(year);
}

export function wavePoints() {
  const day = 24 * 60 * 60 * 1000;
  const points = [];
  for (let time = AXIS_START; time <= AXIS_END; time += 3 * day) {
    points.push([time, waveY(time)]);
  }
  const last = points[points.length - 1];
  if (!last || last[0] !== AXIS_END) {
    points.push([AXIS_END, waveY(AXIS_END)]);
  }
  return points;
}

export function symbolFor(verify) {
  if (verify === "수정") return "emptyCircle";
  if (verify === "불일치·확인불가") return "diamond";
  return "circle";
}

export function yymm(date) {
  const [year, month] = date.split("-");
  return `${year.slice(2)}${month}`;
}

export function usableUrl(value) {
  const text = (value || "").trim();
  if (!text || text === "해당없음" || text === "미확인") return "";
  if (!/^https?:\/\//i.test(text)) return "";
  return text;
}

export function matches(model, filter) {
  if (filter.field && model.field !== filter.field) return false;
  if (filter.country && model.country !== filter.country) return false;
  if (filter.lane === "open" && LANE[model.openness] !== 1) return false;
  if (filter.lane === "closed" && LANE[model.openness] !== -1) return false;
  if (filter.lane === "unknown" && LANE[model.openness] !== 0) return false;
  return true;
}

export function appearance(model) {
  const timestamp = parseRelease(model.date);
  const year = new Date(timestamp).getUTCFullYear();
  const wave = waveY(timestamp);
  const y = pointY(model);
  return {
    timestamp,
    year,
    era: eraOf(year),
    lane: LANE[model.openness],
    wave,
    y,
    symbol: symbolFor(model.verify),
    korea: model.country === "한국",
  };
}

export function labelFor(model, spanDays, selectedId) {
  if (model.id === selectedId) {
    return { show: true, text: `${yymm(model.date)}\n${model.name}` };
  }
  if (model.landmark && spanDays >= LANDMARK_NAME_SPAN_DAYS) {
    return { show: true, text: yymm(model.date) };
  }
  if (model.landmark) {
    return { show: true, text: `${yymm(model.date)}\n${model.name}` };
  }
  if (spanDays < ALL_NAME_SPAN_DAYS) {
    return { show: true, text: model.name };
  }
  return { show: false, text: model.name };
}

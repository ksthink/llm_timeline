import "./style.css";
import payload from "./data/models.json";
import { ERAS, matches, usableUrl, yymm, eraOf } from "./layout.js";
import { mountChart } from "./chart.js";

const models = payload.models;
const fieldSelect = document.querySelector("#field");
const countrySelect = document.querySelector("#country");
const laneSelect = document.querySelector("#lane");
const resetButton = document.querySelector("#reset");
const eraButtons = document.querySelector("#eras");
const stats = document.querySelector("#stats");
const detail = document.querySelector("#detail");

function fillSelect(select, values) {
  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  }
}

function counts(key) {
  const map = new Map();
  for (const model of models) {
    map.set(model[key], (map.get(model[key]) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"));
}

fillSelect(fieldSelect, counts("field").map(([value]) => value));
fillSelect(countrySelect, counts("country").map(([value]) => value));

for (const era of ERAS) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "era";
  button.dataset.era = era.id;
  button.title = era.name;
  button.style.setProperty("--swatch", era.color);
  button.innerHTML = `<i></i><span>${era.label}</span>`;
  button.addEventListener("click", () => chart.zoomEra(era.id));
  eraButtons.append(button);
}

function currentFilter() {
  return {
    field: fieldSelect.value,
    country: countrySelect.value,
    lane: laneSelect.value,
  };
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function link(href, label) {
  const url = usableUrl(href);
  if (!url) return "";
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

function renderDetail(model) {
  const year = Number(model.date.slice(0, 4));
  const era = eraOf(year);
  const links = [
    link(model.official, "공식 페이지"),
    model.official !== model.source ? link(model.source, "출처") : "",
    link(model.hf, "Hugging Face"),
    link(model.archive, "아카이브"),
  ].filter(Boolean);
  const hidden = !matches(model, currentFilter());
  detail.style.setProperty("--era", era?.color ?? "#9a9a9a");
  detail.innerHTML = `
    <p class="kicker">${yymm(model.date)} · ${escapeHtml(era?.label ?? "")} ${escapeHtml(era?.name ?? "")}${model.landmark ? " · 이정표" : ""}</p>
    <h2>${escapeHtml(model.name)}</h2>
    <p class="summary">${escapeHtml(model.summary)}</p>
    <dl>
      <div><dt>출시</dt><dd>${escapeHtml(model.date)}</dd></div>
      <div><dt>회사</dt><dd>${escapeHtml(model.company)}</dd></div>
      <div><dt>국가</dt><dd>${escapeHtml(model.country)}</dd></div>
      <div><dt>분야</dt><dd>${escapeHtml(model.field)}</dd></div>
      <div><dt>공개</dt><dd>${escapeHtml(model.openness)}</dd></div>
      <div><dt>검증</dt><dd>${escapeHtml(model.verify)}</dd></div>
      <div><dt>페이지</dt><dd>${escapeHtml(model.pageStatus || "—")}</dd></div>
    </dl>
    ${hidden ? '<p class="aside-note">이 모델은 현재 필터 밖에 있습니다.</p>' : ""}
    ${links.length ? `<p class="links">${links.join("")}</p>` : ""}
    ${model.notes ? `<p class="notes">${escapeHtml(model.notes)}</p>` : ""}
    ${model.evidence ? `<details><summary>검증 메모</summary><p>${escapeHtml(model.evidence)}</p></details>` : ""}
  `;
}

function renderStats(view) {
  stats.textContent = `${view.shown.toLocaleString("ko-KR")}개 표시 · 오픈 ${view.open.toLocaleString("ko-KR")} · 비공개 ${view.closed.toLocaleString("ko-KR")} · 미확인 ${view.unknown.toLocaleString("ko-KR")}`;
  const active = ERAS.find((era) => {
    const start = Date.UTC(era.start, 0, 1);
    const end = Date.UTC(era.end, 11, 31, 23, 59, 59);
    return Math.abs(view.start - start) < 5 * 86400000 && Math.abs(view.end - end) < 40 * 86400000;
  });
  for (const button of eraButtons.querySelectorAll("button")) {
    button.setAttribute("aria-pressed", String(button.dataset.era === active?.id));
  }
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const chart = mountChart(document.querySelector("#chart"), models, {
  animate: !reduceMotion,
  onSelect(model) {
    renderDetail(model);
    if (window.matchMedia("(max-width: 900px)").matches) {
      detail.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    }
  },
  onView: renderStats,
});

function applyFilter() {
  chart.setFilter(currentFilter());
  const selected = chart.selected();
  if (selected) renderDetail(selected);
}

fieldSelect.addEventListener("change", applyFilter);
countrySelect.addEventListener("change", applyFilter);
laneSelect.addEventListener("change", applyFilter);
resetButton.addEventListener("click", () => chart.resetZoom());

document.fonts?.ready.then(() => chart.resize());

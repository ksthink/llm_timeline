import { dia, util, shapes as defaultShapes } from "@joint/core";
import payload from "./data/models.json";
import { filterModels, readableOnDark, shadeHexColor, usableUrl, yearCards } from "./layout.js";
import { logoFor } from "./logos.js";
import "./style.css";

const FONT = '"WenQuanYi Micro Hei", "Noto Sans KR", sans-serif';
const timelineColor = "#fff";
const backgroundColor = "#444";
const padding = 16;
const gap = 112;
const timelineY = 420;
const timelineXMin = 190;
const eventSize = 46;
const chevronHeight = 8;
const chevronWidth = 3;
const offsets = [108, -214, 172, -140];

const frame = { xMin: timelineXMin, xMax: timelineXMin + 400 };

const timelineEventMarkup = util.svg`
  <ellipse @selector="body"/>
  <ellipse @selector="plate"/>
  <image @selector="logo"/>
  <text @selector="title"/>
  <text @selector="subtitle"/>
  <text @selector="description"/>
`;

class TimelineEvent extends dia.Element {
  defaults() {
    return {
      ...super.defaults,
      type: "TimelineEvent",
      attrs: {
        root: { magnetSelector: "body", cursor: "pointer" },
        body: {
          stroke: "none",
          cx: "calc(w/2)",
          cy: "calc(h/2)",
          rx: "calc(w/2)",
          ry: "calc(h/2)",
        },
        plate: {
          fill: "#ffffff",
          stroke: "none",
          cx: "calc(w/2)",
          cy: "calc(h/2)",
          rx: 15,
          ry: 15,
        },
        logo: {
          width: 24,
          height: 24,
          x: 11,
          y: 11,
          pointerEvents: "none",
          preserveAspectRatio: "xMidYMid meet",
        },
        title: {
          fontSize: 22,
          fontFamily: FONT,
          fontWeight: "bold",
          fill: timelineColor,
          textVerticalAnchor: "top",
          textAnchor: "middle",
          x: "calc(w/2)",
          y: "calc(h + 14)",
        },
        subtitle: {
          fontSize: 15,
          fontFamily: FONT,
          fontWeight: "bold",
          fill: "#ffffff",
          textVerticalAnchor: "top",
          textAnchor: "middle",
          x: "calc(w/2)",
          y: "calc(h + 44)",
        },
        description: {
          fontSize: 13,
          fontFamily: FONT,
          fontWeight: "600",
          fill: "#ffffff",
          textVerticalAnchor: "top",
          textAnchor: "middle",
          x: "calc(w/2)",
          y: "calc(h + 66)",
        },
      },
    };
  }

  preinitialize() {
    this.markup = timelineEventMarkup;
  }

  positionLabels() {
    const below = this.position().y > timelineY;
    if (below) {
      this.attr({
        title: { y: "calc(h + 12)", textVerticalAnchor: "top" },
        subtitle: { y: "calc(h + 50)", textVerticalAnchor: "top" },
        description: { y: "calc(h + 82)", textVerticalAnchor: "top" },
      });
      return;
    }
    this.attr({
      title: { y: -18, textVerticalAnchor: "bottom" },
      description: { y: -58, textVerticalAnchor: "bottom" },
      subtitle: { y: -88, textVerticalAnchor: "bottom" },
    });
  }
}

const shapes = { ...defaultShapes, TimelineEvent };
const graph = new dia.Graph({}, { cellNamespace: shapes });
const paper = new dia.Paper({
  model: graph,
  background: { color: backgroundColor },
  cellViewNamespace: shapes,
  defaultConnectionPoint: { name: "boundary" },
  defaultLink: () => new shapes.standard.DoubleLink(),
  defaultLinkAnchor: { name: "connectionPerpendicular" },
  interactive: (cellView) => cellView.model instanceof TimelineEvent,
  restrictTranslate(elementView) {
    const bbox = elementView.model.getBBox();
    const yMin = timelineY - bbox.height - 28;
    const yMax = timelineY + 28;
    return (x, y) => ({
      x: Math.max(frame.xMin, Math.min(frame.xMax - bbox.width, x)),
      y: y > timelineY ? Math.max(yMax, y) : Math.min(yMin, y),
    });
  },
  gridSize: 10,
  async: true,
  sorting: dia.Paper.sorting.APPROX,
  preventDefaultBlankAction: false,
});

const paperContainer = document.querySelector("#paper-container");
paperContainer.appendChild(paper.el);

const models = payload.models;
const events = new Map();
let selectedId = null;
let openYear = null;

const countrySelect = document.querySelector("#country");
const modelInput = document.querySelector("#model");
const modelList = document.querySelector("#model-list");
const countEl = document.querySelector("#count");
const emptyEl = document.querySelector("#empty");
const detail = document.querySelector("#detail");
const detailYear = document.querySelector("#detail-year");
const detailMeta = document.querySelector("#detail-meta");
const detailList = document.querySelector("#detail-list");

const countries = new Map();
for (const model of models) countries.set(model.country, (countries.get(model.country) ?? 0) + 1);
for (const [country] of [...countries.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))) {
  const option = document.createElement("option");
  option.value = country;
  option.textContent = `${country} ${countries.get(country)}`;
  countrySelect.append(option);
}
for (const model of models) {
  const option = document.createElement("option");
  option.value = model.name;
  modelList.append(option);
}

function scaleToFit() {
  if (!graph.getCells().length) return;
  const bbox = graph.getBBox();
  const labelPadTop = 108;
  const labelPadBottom = 108;
  const box = {
    x: bbox.x - 8,
    y: bbox.y - labelPadTop,
    width: bbox.width + 16,
    height: bbox.height + labelPadTop + labelPadBottom,
  };
  const availW = paperContainer.clientWidth || 1200;
  const availH = paperContainer.clientHeight || 700;
  const fit = Math.min((availW - 8) / box.width, (availH - 8) / box.height, 1);
  const used = Math.max(fit, availW < 1100 ? 0.92 : 0.86);
  const width = Math.max(availW, box.width * used);
  const height = Math.max(availH, box.height * used);
  paper.setDimensions(width, height);
  paper.scale(used, used);
  paper.translate((width - box.width * used) / 2 - box.x * used, (height - box.height * used) / 2 - box.y * used);
}

function setPanelOpen(open) {
  detail.hidden = !open;
  paperContainer.style.right = open ? "360px" : "0px";
  scaleToFit();
}

function renderDetail(card) {
  detailYear.textContent = String(card.year);
  detailYear.style.color = readableOnDark(card.color, "#3a3a3a");
  detailMeta.textContent = `${card.era?.name ?? ""} · ${card.models.length.toLocaleString("ko-KR")}개`;
  detailList.replaceChildren();
  for (const model of card.models) {
    const item = document.createElement("li");
    const logo = logoFor(model.company);
    const image = document.createElement("img");
    image.src = logo.srcBrand;
    image.alt = "";
    image.width = 28;
    image.height = 28;
    const body = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = model.name;
    const meta = document.createElement("span");
    meta.textContent = `${model.date} · ${model.company} · ${model.country} · ${model.openness}`;
    const summary = document.createElement("p");
    summary.textContent = model.summary;
    body.append(name, meta, summary);
    const links = document.createElement("p");
    links.className = "links";
    for (const [href, label] of [
      [model.official, "공식"],
      [model.source === model.official ? "" : model.source, "출처"],
      [model.hf, "Hugging Face"],
    ]) {
      const url = usableUrl(href);
      if (!url) continue;
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = label;
      links.append(anchor);
    }
    if (links.childNodes.length) body.append(links);
    item.append(image, body);
    detailList.append(item);
  }
}

function selectEvent(id, { toggle = true } = {}) {
  if (toggle && selectedId === id && !detail.hidden) {
    events.get(id)?.event.attr("body/stroke", "none");
    selectedId = null;
    openYear = null;
    setPanelOpen(false);
    return;
  }
  if (selectedId && selectedId !== id) events.get(selectedId)?.event.attr("body/stroke", "none");
  const entry = events.get(id);
  if (!entry) return;
  entry.event.attr({ body: { stroke: "#fff", strokeWidth: 2 } });
  selectedId = id;
  openYear = entry.card.year;
  renderDetail(entry.card);
  setPanelOpen(true);
  const center = entry.event.getBBox().center();
  const point = paper.localToClientPoint(center);
  const bounds = paperContainer.getBoundingClientRect();
  const shift = point.x - (bounds.left + Math.min(420, bounds.width * 0.45));
  if (Math.abs(shift) > 24) paperContainer.scrollLeft += shift;
}

function renderTimeline() {
  const filtered = filterModels(models, {
    country: countrySelect.value,
    model: modelInput.value,
  });
  const visible = yearCards(filtered).filter((card) => card.models.length > 0);
  graph.clear();
  events.clear();
  selectedId = null;
  countEl.textContent = `${filtered.length.toLocaleString("ko-KR")}개 표시`;
  emptyEl.hidden = visible.length > 0;
  if (!visible.length) {
    openYear = null;
    setPanelOpen(false);
    return;
  }

  const timelineXMax = timelineXMin + padding + gap * Math.max(visible.length - 1, 0) + 24;
  frame.xMin = timelineXMin;
  frame.xMax = timelineXMax;

  const start = new shapes.standard.Ellipse({
    position: { x: timelineXMin - 150, y: timelineY - 58 },
    size: { width: 116, height: 116 },
    attrs: {
      root: { pointerEvents: "none" },
      body: { stroke: timelineColor, fill: backgroundColor, strokeWidth: 3 },
      label: {
        fill: shadeHexColor(visible[0].color, 0.35),
        fontFamily: FONT,
        fontSize: 16,
        fontWeight: "bold",
        text: "LLM\n타임라인",
      },
    },
  });
  const end = new shapes.standard.Ellipse({
    position: { x: timelineXMax + 28, y: timelineY - 30 },
    size: { width: 64, height: 64 },
    attrs: {
      root: { pointerEvents: "none" },
      body: { stroke: timelineColor, fill: backgroundColor, strokeWidth: 3 },
      label: {
        fill: timelineColor,
        fontFamily: FONT,
        fontSize: 14,
        fontWeight: "bold",
        text: String(visible.at(-1).year),
      },
    },
  });
  const chevronCount = Math.max(12, visible.length * 4);
  const timeline = new shapes.standard.Link({
    source: { id: start.id },
    target: { id: end.id },
    z: -2,
    attrs: {
      root: { pointerEvents: "none" },
      line: {
        strokeWidth: chevronHeight,
        stroke: timelineColor,
        targetMarker: null,
        vertexMarker: {
          d: `M -${2 * chevronWidth} -${chevronHeight / 2} h ${chevronWidth} L 0 0 -${chevronWidth} ${chevronHeight / 2} h -${chevronWidth} L -${chevronWidth} 0 z`,
          fill: backgroundColor,
          stroke: "none",
        },
      },
    },
    vertices: Array.from({ length: chevronCount }, (_, index) => ({
      x: timelineXMin + padding + (index * (timelineXMax - timelineXMin - padding)) / chevronCount,
      y: timelineY,
    })),
  });
  graph.addCells([start, end, timeline]);

  visible.forEach((card, index) => {
    const offset = offsets[index % offsets.length];
    const extra = card.models.length - (card.lead ? 1 : 0);
    const logo = logoFor(card.lead?.company ?? "");
    const event = new TimelineEvent({
      position: {
        x: timelineXMin + padding + index * gap,
        y: offset > 0 ? timelineY + offset : timelineY + offset - eventSize,
      },
      size: { width: eventSize, height: eventSize },
      attrs: {
        body: { fill: card.color },
        logo: { href: logo.srcBrand, xlinkHref: logo.srcBrand },
        title: { fill: readableOnDark(card.color, backgroundColor), text: String(card.year) },
        subtitle: {
          text: card.lead?.name ?? "",
          textWrap: { width: 150, height: 22, ellipsis: true },
        },
        description: {
          text: extra > 0 ? `외 ${extra}건` : (card.lead?.company ?? ""),
          textWrap: { width: 150, height: 18, ellipsis: true },
        },
      },
    });
    const stem = new shapes.standard.Link({
      source: { id: event.id },
      target: { id: timeline.id },
      z: -1,
      attrs: {
        root: { pointerEvents: "none" },
        line: {
          strokeWidth: 1,
          stroke: timelineColor,
          strokeDasharray: "2,2",
          targetMarker: {
            markup: util.svg`
              <circle r="11" stroke="${timelineColor}" stroke-width="1" fill="${backgroundColor}" />
              <circle r="6" fill="${card.color}" stroke="none" />
            `,
          },
        },
      },
    });
    event.positionLabels();
    graph.addCells([event, stem]);
    events.set(event.id, { event, card });
  });

  const reopen = [...events.values()].find((entry) => entry.card.year === openYear);
  if (reopen) selectEvent(reopen.event.id, { toggle: false });
  else if (!detail.hidden) setPanelOpen(false);
  else scaleToFit();
}

graph.on("change:position", (cell) => {
  if (cell instanceof TimelineEvent) cell.positionLabels();
});
paper.on("element:pointerclick", (view) => {
  if (events.has(view.model.id)) selectEvent(view.model.id);
});

countrySelect.addEventListener("change", () => renderTimeline());
modelInput.addEventListener("input", () => renderTimeline());
document.querySelector("#clear-filter").addEventListener("click", () => {
  countrySelect.value = "";
  modelInput.value = "";
  openYear = null;
  renderTimeline();
});
document.querySelector("#close-detail").addEventListener("click", () => {
  if (selectedId) events.get(selectedId)?.event.attr("body/stroke", "none");
  selectedId = null;
  openYear = null;
  setPanelOpen(false);
});
window.addEventListener("resize", () => scaleToFit());
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !detail.hidden) document.querySelector("#close-detail").click();
});

renderTimeline();

import * as echarts from "echarts/core";
import { LineChart, ScatterChart } from "echarts/charts";
import {
  DataZoomComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import {
  ALL_NAME_SPAN_DAYS,
  AXIS_END,
  AXIS_START,
  ERAS,
  LANE,
  LANDMARK_NAME_SPAN_DAYS,
  MONTH_AXIS_SPAN_DAYS,
  appearance,
  labelFor,
  matches,
  wavePoints,
  waveY,
  yymm,
} from "./layout.js";

echarts.use([
  LineChart,
  ScatterChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  CanvasRenderer,
]);

const FONT = '"WenQuanYi Micro Hei", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif';

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function axisFormatter(spanDays) {
  return (value) => {
    const date = new Date(value);
    const year = date.getUTCFullYear();
    if (spanDays > MONTH_AXIS_SPAN_DAYS) return String(year);
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    return `${year}.${month}`;
  };
}

function waveSeries() {
  const points = wavePoints();
  return ERAS.map((era, index) => {
    const data = [];
    for (const [time, y] of points) {
      const year = new Date(time).getUTCFullYear();
      const inEra = year >= era.start && year <= era.end;
      const leading = year < ERAS[0].start && index === 0;
      const trailing = year > ERAS[ERAS.length - 1].end && index === ERAS.length - 1;
      if (inEra || leading || trailing) data.push([time, y]);
    }
    const next = ERAS[index + 1];
    if (next) {
      const time = Date.UTC(next.start, 0, 1);
      data.push([time, waveY(time)]);
    }
    data.sort((a, b) => a[0] - b[0]);
    return {
      name: `흐름-${era.id}`,
      type: "line",
      data,
      showSymbol: false,
      silent: true,
      z: 1,
      animation: false,
      legendHoverLink: false,
      lineStyle: { width: 4, color: era.color, cap: "round", join: "round" },
      emphasis: { disabled: true },
      tooltip: { show: false },
    };
  });
}

function markerSeries() {
  return {
    name: "시대 경계",
    type: "scatter",
    z: 5,
    cursor: "pointer",
    symbol: "circle",
    symbolSize: 12,
    itemStyle: { color: "#f4f4f4", borderColor: "#141416", borderWidth: 2 },
    data: ERAS.map((era) => {
      const time = Date.UTC(era.start, 0, 1);
      return {
        value: [time, waveY(time)],
        era,
        label: { show: false },
      };
    }),
    tooltip: {
      formatter(params) {
        const era = params.data.era;
        return `${era.label} ${era.name}<br/>클릭하면 이 시대로 확대`;
      },
    },
  };
}

function modelSeries(models, spanDays, selectedId) {
  const dense = spanDays > 1000;
  return {
    name: "모델",
    type: "scatter",
    z: 3,
    cursor: "pointer",
    clip: false,
    animationDurationUpdate: 400,
    data: models.map((model) => {
      const view = appearance(model);
      const label = labelFor(model, spanDays, selectedId);
      const lane = view.lane;
      const selected = model.id === selectedId;
      const korea = view.korea;
      const revised = model.verify === "수정";
      const color = view.era?.color ?? "#9a9a9a";
      let borderColor = "rgba(0,0,0,0.35)";
      let borderWidth = 0;
      if (korea) {
        borderColor = "#f5f5f5";
        borderWidth = 1.6;
      }
      if (selected) {
        borderColor = "#ffffff";
        borderWidth = 2.4;
      }
      const baseSize = model.landmark ? 15 : dense ? 6 : 8;
      return {
        value: [view.timestamp, view.y],
        model,
        labelText: label.text,
        symbol: view.symbol,
        symbolSize: selected ? baseSize + 5 : baseSize,
        itemStyle: {
          color: revised ? "transparent" : color,
          borderColor: revised ? (korea || selected ? "#f5f5f5" : color) : borderColor,
          borderWidth: revised ? (korea || selected ? 2 : 1.5) : borderWidth,
          opacity: model.landmark || selected ? 1 : 0.92,
        },
        label: {
          show: label.show,
          position: lane < 0 ? "bottom" : "top",
          distance: model.landmark ? 8 : 4,
          color: selected ? "#ffffff" : model.landmark ? color : "#d5d5d5",
          fontSize: model.landmark ? 12 : 11,
          fontWeight: model.landmark ? 700 : 500,
        },
      };
    }),
    label: {
      fontFamily: FONT,
      textBorderColor: "#070708",
      textBorderWidth: 3,
      lineHeight: 15,
      formatter(params) {
        return params.data.labelText || "";
      },
    },
    labelLayout: { hideOverlap: true },
    emphasis: {
      focus: "self",
      scale: 1.35,
      label: {
        show: true,
        color: "#ffffff",
        fontWeight: 700,
        formatter(params) {
          const model = params.data.model;
          return `${yymm(model.date)}\n${model.name}`;
        },
      },
      itemStyle: { borderColor: "#ffffff", borderWidth: 2 },
    },
    blur: { itemStyle: { opacity: 0.18 } },
  };
}

function tooltipFormatter(params) {
  if (params.seriesName === "시대 경계") {
    const era = params.data.era;
    return `${era.label} ${era.name}<br/>클릭하면 이 시대로 확대`;
  }
  const model = params.data?.model;
  if (!model) return "";
  const view = appearance(model);
  const laneText = view.lane > 0 ? "파도 위 · 오픈" : view.lane < 0 ? "파도 아래 · 비공개" : "파도 위 · 미확인";
  return [
    `<strong>${escapeHtml(model.name)}</strong>`,
    `${escapeHtml(model.date)} · ${escapeHtml(laneText)}`,
    `${escapeHtml(model.company)} · ${escapeHtml(model.country)}`,
    `${escapeHtml(model.field)} · 검증 ${escapeHtml(model.verify)}`,
    escapeHtml(model.summary),
  ].join("<br/>");
}

export function buildSeries(models, { spanDays, selectedId }) {
  return [...waveSeries(), modelSeries(models, spanDays, selectedId), markerSeries()];
}

function baseOption(series, spanDays, animate) {
  return {
    backgroundColor: "transparent",
    animation: animate,
    animationDurationUpdate: animate ? 400 : 0,
    textStyle: { fontFamily: FONT },
    grid: { left: 96, right: 28, top: 72, bottom: 74 },
    tooltip: {
      trigger: "item",
      confine: true,
      backgroundColor: "#141416",
      borderColor: "#2e2e32",
      textStyle: { color: "#f2f2f2", fontSize: 12, fontFamily: FONT },
      extraCssText: "max-width:280px;white-space:normal;",
      formatter: tooltipFormatter,
    },
    xAxis: {
      type: "time",
      min: AXIS_START,
      max: AXIS_END,
      axisLine: { lineStyle: { color: "#2c2c30" } },
      axisTick: { lineStyle: { color: "#2c2c30" } },
      splitLine: { show: false },
      axisLabel: {
        color: "#9a9a9a",
        fontFamily: FONT,
        hideOverlap: true,
        formatter: axisFormatter(spanDays),
      },
      axisPointer: { show: false },
    },
    yAxis: {
      type: "value",
      min: -2,
      max: 2,
      interval: 1,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: {
        color: "#8e8e8e",
        fontFamily: FONT,
        fontSize: 12,
        formatter(value) {
          const rounded = Math.round(value);
          if (rounded === 1) return "오픈";
          if (rounded === -1) return "비공개";
          return "";
        },
      },
    },
    dataZoom: [
      {
        type: "inside",
        xAxisIndex: 0,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        moveOnMouseWheel: false,
      },
      {
        type: "slider",
        xAxisIndex: 0,
        height: 18,
        bottom: 16,
        fillerColor: "rgba(255,255,255,0.08)",
        borderColor: "#2a2a2e",
        backgroundColor: "#101012",
        handleSize: "90%",
        handleStyle: { color: "#d0d0d0", borderColor: "#d0d0d0" },
        moveHandleStyle: { color: "#3a3a3e" },
        textStyle: { color: "#8a8a8a", fontSize: 10, fontFamily: FONT },
        dataBackground: {
          lineStyle: { color: "#5c5c60" },
          areaStyle: { color: "rgba(255,255,255,0.04)" },
        },
        selectedDataBackground: {
          lineStyle: { color: "#c6c6c6" },
          areaStyle: { color: "rgba(255,255,255,0.1)" },
        },
        brushSelect: false,
        labelFormatter(value) {
          return String(new Date(value).getUTCFullYear());
        },
      },
    ],
    series,
  };
}

export function visibleRange(chart) {
  const option = chart.getOption();
  const zoom = option.dataZoom?.[0] ?? {};
  let start = zoom.startValue;
  let end = zoom.endValue;
  if (start == null || end == null) {
    const from = zoom.start ?? 0;
    const to = zoom.end ?? 100;
    const span = AXIS_END - AXIS_START;
    start = AXIS_START + (from / 100) * span;
    end = AXIS_START + (to / 100) * span;
  }
  return { start, end, spanDays: (end - start) / 86400000 };
}

export function mountChart(element, models, { onSelect, onView, animate = true } = {}) {
  const chart = echarts.init(element, null, { renderer: "canvas" });
  let ready = false;
  let applying = false;
  const state = {
    field: "",
    country: "",
    lane: "",
    selectedId: models.find((model) => model.name === "ChatGPT (GPT-3.5)")?.id ?? models[0]?.id,
    spanDays: (AXIS_END - AXIS_START) / 86400000,
    showMonth: false,
  };

  function filtered() {
    return models.filter((model) => matches(model, state));
  }

  function publish() {
    const rows = filtered();
    const range = visibleRange(chart);
    onView?.({
      shown: rows.length,
      total: models.length,
      open: rows.filter((model) => LANE[model.openness] === 1).length,
      closed: rows.filter((model) => LANE[model.openness] === -1).length,
      unknown: rows.filter((model) => LANE[model.openness] === 0).length,
      start: range.start,
      end: range.end,
    });
  }

  function draw() {
    const rows = filtered();
    const series = buildSeries(rows, { spanDays: state.spanDays, selectedId: state.selectedId });
    applying = true;
    if (!ready) {
      chart.setOption(baseOption(series, state.spanDays, animate));
      ready = true;
    } else {
      chart.setOption(
        {
          xAxis: { axisLabel: { formatter: axisFormatter(state.spanDays) } },
          series,
        },
        { replaceMerge: ["series"] },
      );
    }
    applying = false;
    publish();
  }

  chart.on("click", (params) => {
    if (params.seriesName === "시대 경계") {
      zoomEra(params.data.era.id);
      return;
    }
    if (params.seriesName === "모델" && params.data?.model) {
      state.selectedId = params.data.model.id;
      draw();
      onSelect?.(params.data.model);
    }
  });

  chart.on("datazoom", () => {
    if (applying) return;
    const range = visibleRange(chart);
    const showMonth = range.spanDays <= MONTH_AXIS_SPAN_DAYS;
    const relabel =
      (range.spanDays >= LANDMARK_NAME_SPAN_DAYS) !== (state.spanDays >= LANDMARK_NAME_SPAN_DAYS) ||
      (range.spanDays < ALL_NAME_SPAN_DAYS) !== (state.spanDays < ALL_NAME_SPAN_DAYS);
    state.spanDays = range.spanDays;
    if (relabel || showMonth !== state.showMonth) {
      state.showMonth = showMonth;
      draw();
      return;
    }
    publish();
  });

  function zoomEra(eraId) {
    const era = ERAS.find((item) => item.id === eraId);
    if (!era) return;
    chart.dispatchAction({
      type: "dataZoom",
      startValue: Date.UTC(era.start, 0, 1),
      endValue: Date.UTC(era.end, 11, 31, 23, 59, 59),
    });
  }

  function resetZoom() {
    chart.dispatchAction({ type: "dataZoom", start: 0, end: 100 });
  }

  function setFilter(next) {
    state.field = next.field ?? "";
    state.country = next.country ?? "";
    state.lane = next.lane ?? "";
    draw();
  }

  window.addEventListener("resize", () => chart.resize());

  draw();
  const initial = models.find((model) => model.id === state.selectedId);
  if (initial) onSelect?.(initial);

  return {
    chart,
    setFilter,
    zoomEra,
    resetZoom,
    resize: () => chart.resize(),
    selected: () => models.find((model) => model.id === state.selectedId) ?? null,
  };
}

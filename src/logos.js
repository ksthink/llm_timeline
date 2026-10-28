import {
  siAlibabadotcom,
  siAnthropic,
  siBaidu,
  siBytedance,
  siDeepmind,
  siElevenlabs,
  siGoogle,
  siHuggingface,
  siKakao,
  siKuaishou,
  siLg,
  siMeta,
  siMinimax,
  siMistralai,
  siNaver,
  siNvidia,
  siOpenai,
  siSuno,
} from "simple-icons";

const ICONS = [
  [/deepmind/i, siDeepmind],
  [/google/i, siGoogle],
  [/openai/i, siOpenai],
  [/anthropic/i, siAnthropic],
  [/meta|facebook/i, siMeta],
  [/nvidia/i, siNvidia],
  [/mistral/i, siMistralai],
  [/\blg\b/i, siLg],
  [/hugging face|bigscience|bigcode/i, siHuggingface],
  [/naver/i, siNaver],
  [/kakao/i, siKakao],
  [/bytedance/i, siBytedance],
  [/baidu/i, siBaidu],
  [/eleven/i, siElevenlabs],
  [/suno/i, siSuno],
  [/minimax/i, siMinimax],
  [/kuaishou/i, siKuaishou],
  [/alibaba/i, siAlibabadotcom],
];

const MONOGRAMS = [
  [/xai/i, "X"],
  [/deepseek/i, "DS"],
  [/midjourney/i, "MJ"],
  [/stability/i, "S"],
  [/microsoft/i, "MS"],
  [/moonshot/i, "K"],
  [/z\.ai|zhipu/i, "Z"],
  [/black forest/i, "BF"],
  [/upstage/i, "UP"],
  [/sk텔레콤/i, "SK"],
  [/ncsoft/i, "NC"],
  [/^kt$/i, "KT"],
  [/cohere/i, "Co"],
  [/runway/i, "R"],
  [/\btii\b/i, "TI"],
  [/eleuther/i, "EL"],
  [/stanford/i, "SU"],
  [/allen|ai2/i, "AI"],
  [/ai21/i, "21"],
  [/preferred/i, "PF"],
  [/sakana/i, "Sa"],
  [/physical intelligence/i, "PI"],
];

function iconUri(icon, fill) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${fill}" d="${icon.path}"/></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function monogramUri(letters, fill, background) {
  const size = letters.length > 2 ? 9 : letters.length > 1 ? 12 : 15;
  const plate = background ? `<rect width="24" height="24" rx="5" fill="${background}"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${plate}<text x="12" y="16.5" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="700" fill="${fill}">${letters}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function monogram(company) {
  for (const [pattern, letters] of MONOGRAMS) {
    if (pattern.test(company)) return letters;
  }
  const words = company.split(/[^A-Za-z0-9가-힣]+/).filter(Boolean);
  if (words.length >= 2 && /^[A-Za-z0-9]/.test(words[0]) && /^[A-Za-z0-9]/.test(words[1])) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return company.replace(/[^A-Za-z0-9가-힣]/g, "").slice(0, 2).toUpperCase() || "?";
}

export function logoFor(company) {
  const name = company || "";
  for (const [pattern, icon] of ICONS) {
    if (pattern.test(name)) {
      return {
        src: iconUri(icon, "#ffffff"),
        srcBrand: iconUri(icon, `#${icon.hex}`),
        label: icon.title,
      };
    }
  }
  const letters = monogram(name);
  return {
    src: monogramUri(letters, "#ffffff"),
    srcBrand: monogramUri(letters, "#1c1c1c"),
    label: name,
  };
}

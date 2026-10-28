# LLM TIMELINE

2015–2026 AI 모델 283건을 연도별 타임라인으로 봅니다. 형태는 [JointJS Node.js Milestones Timeline](https://github.com/clientIO/joint-demos/tree/main/nodejs-milestones-timeline)을 따릅니다. 곧은 축, 축에 붙는 점선, 위아래가 번갈아 오는 연도 카드입니다. 다이어그램은 [JointJS](https://www.jointjs.com/) `@joint/core`입니다.

한 해에는 대표 모델 이름과 회사 로고만 올려 글자가 겹치지 않게 했습니다. 나머지는 `외 N건`으로 줄이고, 연도 점을 누르면 그 해 전체 목록이 열립니다. 국가와 모델 이름으로 목록을 거를 수 있습니다. 점은 축의 위아래로 옮길 수 있습니다. 좁은 화면에서는 글자를 줄이지 않고 가로로 스크롤합니다.

## 실행

```bash
npm install
npm test
npm run dev
```

브라우저에서 `http://localhost:5173` 을 엽니다.

## 데이터

원본은 `data/models.csv` 입니다.

```bash
npm run data
```

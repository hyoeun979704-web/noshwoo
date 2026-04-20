// MVP: hardcoded terminal reference for 3~5 key Chungnam nodes.
// Live MOLIT transit API wiring deferred until post-MVP.
export type TerminalRef = {
  code: string;
  name: string;
  sigungu: string;
  lat: number;
  lng: number;
};

export const CHUNGNAM_TERMINALS: TerminalRef[] = [
  { code: "CH-CHEONAN", name: "천안종합터미널", sigungu: "천안시", lat: 36.8205, lng: 127.1569 },
  { code: "CH-ASAN", name: "아산온양터미널", sigungu: "아산시", lat: 36.7891, lng: 127.0045 },
  { code: "CH-BORYEONG", name: "보령시외버스터미널", sigungu: "보령시", lat: 36.3499, lng: 126.5966 },
  { code: "CH-GONGJU", name: "공주종합터미널", sigungu: "공주시", lat: 36.4471, lng: 127.1249 },
  { code: "CH-SEOSAN", name: "서산공용버스터미널", sigungu: "서산시", lat: 36.7849, lng: 126.4504 },
];

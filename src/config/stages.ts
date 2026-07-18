import type { StageDef } from './assets';

/**
 * 場地資料表。
 * - backgroundImage 有值(相對 public/assets/)就用圖,null 則用漸層
 * - gradientTop/Bottom 同時也是選場地畫面的預覽卡顏色
 */
export interface StageEntry extends StageDef {
  id: string;
  name: string;
}

export const STAGES: StageEntry[] = [
  {
    id: 'rooftop',
    name: '天台黃昏',
    // 台北天台夜景(原圖置中裁 16:9 縮至 960×540,鋪面與地面帶對齊)
    backgroundImage: 'stage-bg.png',
    drawGround: false, // 背景圖自帶天台地面
    gradientTop: '#5b4a8a',
    gradientBottom: '#e8935a',
    groundColor: 0x55505c,
    groundEdgeColor: 0x6a6478,
    horizonY: 370,
  },
  {
    id: 'street',
    name: '街道夜晚',
    // 夜市老街(原圖置中裁 16:9 縮至 960×540,石板地與地面帶對齊)
    backgroundImage: 'stage-street.png',
    drawGround: false,
    gradientTop: '#141a33',
    gradientBottom: '#3a2a3a',
    groundColor: 0x232a3d,
    groundEdgeColor: 0x39445e,
    horizonY: 370,
  },
  {
    id: 'dojo',
    name: '道場白天',
    // 武術道場(木地板與地面帶對齊)
    backgroundImage: 'stage-dojo.png',
    drawGround: false,
    gradientTop: '#d8cdb5',
    gradientBottom: '#8a7355',
    groundColor: 0x8a6f4d,
    groundEdgeColor: 0xa08258,
    horizonY: 370,
  },
];

export function getStage(id: string): StageEntry {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}

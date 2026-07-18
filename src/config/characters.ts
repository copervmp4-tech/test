import { ASSETS } from './assets';
import type { FighterStats } from '../entities/Fighter';

/**
 * 角色資料表。
 * - fighterKey 指向 assets.ts 的 fighters 定義(sprite sheet 與切割參數都在那邊)
 * - portraitPath 是未來的頭像圖(相對 public/assets/),null = 選角畫面用代表色塊
 * - 數值倍率作用在 balance.ts 的基礎數值上
 */
export interface CharacterDef {
  id: string;
  name: string;
  color: number;                            // 代表色(選角格、UI 用)
  description: string;                      // 選角畫面的一句話介紹
  stats: FighterStats;                      // 血量上限 / 速度倍率 / 傷害倍率
  portraitPath: string | null;              // 頭像 placeholder:null = 色塊
  fighterKey: keyof typeof ASSETS.fighters; // 使用哪套 sprite sheet
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'power',
    name: 'Daru',
    color: 0xd94040,
    description: '力量型:血厚拳重,腳步偏慢',
    stats: { maxHealth: 130, speedMultiplier: 0.85, damageMultiplier: 1.25 },
    portraitPath: 'portrait-daru.png',
    fighterKey: 'daru',
  },
  {
    id: 'speed',
    name: 'Hanah',
    color: 0x3fae5a,
    description: '速度型:身法飛快,但禁不起打',
    stats: { maxHealth: 80, speedMultiplier: 1.25, damageMultiplier: 0.9 },
    portraitPath: 'portrait-hanah.png',
    fighterKey: 'hanah',
  },
  {
    id: 'balance',
    name: 'Tonni',
    color: 0x3b82f6,
    description: '平衡型:各項均衡,穩紮穩打',
    stats: { maxHealth: 100, speedMultiplier: 1.0, damageMultiplier: 1.0 },
    portraitPath: 'portrait-tonni.png',
    fighterKey: 'tonni',
  },
  {
    id: 'tech',
    name: 'Yama',
    color: 0xe8c33a,
    description: '技巧型:靈巧全面,略偏進攻',
    stats: { maxHealth: 90, speedMultiplier: 1.1, damageMultiplier: 1.1 },
    portraitPath: 'portrait-yama.png',
    fighterKey: 'yama',
  },
];

export function getCharacter(id: string): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

/** 選角畫面數值條的正規化上限(取全角色最大值) */
export const STAT_MAX = {
  maxHealth: Math.max(...CHARACTERS.map((c) => c.stats.maxHealth)),
  speedMultiplier: Math.max(...CHARACTERS.map((c) => c.stats.speedMultiplier)),
  damageMultiplier: Math.max(...CHARACTERS.map((c) => c.stats.damageMultiplier)),
};

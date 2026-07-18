/**
 * 跨場景的全域遊戲狀態:流程場景寫入,FightScene 讀取。
 * 之後做闖關進度、連線對戰時的房間/對手資訊也放這裡。
 */

export type GameMode = 'campaign' | 'versus'; // 闖關 / 對戰

export interface GameStateData {
  mode: GameMode;
  characterId: string; // 玩家選的角色(config/characters.ts 的 id)
  stageId: string;     // 選的場地(config/stages.ts 的 id)
}

/** 預設值讓 FightScene 單獨啟動時也能運作 */
export const GameState: GameStateData = {
  mode: 'versus',
  characterId: 'balance',
  stageId: 'rooftop',
};

import { BALANCE } from '../config/balance';
import { InputToken, MoveDef, TriggerKey } from '../config/moves';

interface Stamped {
  token: InputToken;
  time: number; // ms(scene.time.now)
}

/**
 * 招式指令緩衝:每幀取樣方向 / 防禦的「按下瞬間」成為 token,
 * 觸發鍵(攻擊 / 跳躍)按下時,回頭比對是否有招式的指令序列在時間窗內依序出現。
 * 方向以角色面向為準(forward = 面向前方),由呼叫端先換算好。
 */
export class CommandInput {
  private buffer: Stamped[] = [];
  private prevForward = 0;
  private prevUp = 0;
  private prevBlock = false;

  /**
   * 每幀取樣。
   * @param now       scene.time.now(ms)
   * @param forward   +1 面向前、-1 面向後(已換算面向)
   * @param up        搖桿垂直:< 0 為上
   * @param blockHeld 是否按住防禦
   */
  sample(now: number, forward: number, up: number, blockHeld: boolean): void {
    const dz = BALANCE.command.dirDeadzone;

    const fwd = forward > dz ? 1 : forward < -dz ? -1 : 0;
    if (fwd !== 0 && fwd !== this.prevForward) this.push(fwd > 0 ? 'forward' : 'back', now);
    this.prevForward = fwd;

    const vert = up < -dz ? -1 : up > dz ? 1 : 0;
    if (vert !== 0 && vert !== this.prevUp) this.push(vert < 0 ? 'up' : 'down', now);
    this.prevUp = vert;

    if (blockHeld && !this.prevBlock) this.push('defend', now);
    this.prevBlock = blockHeld;

    // 清掉超出時間窗的舊 token
    const cutoff = now - BALANCE.command.window * 1000;
    while (this.buffer.length && this.buffer[0].time < cutoff) this.buffer.shift();
  }

  /** 觸發鍵按下時比對;命中回傳 moveId 並清空緩衝,否則 null */
  match(now: number, trigger: TriggerKey, moves: MoveDef[]): string | null {
    const cutoff = now - BALANCE.command.window * 1000;
    const recent = this.buffer.filter((e) => e.time >= cutoff);
    for (const move of moves) {
      if (move.trigger !== trigger) continue;
      if (this.isSubsequence(move.command, recent)) {
        this.buffer = [];
        return move.id;
      }
    }
    return null;
  }

  private push(token: InputToken, time: number): void {
    this.buffer.push({ token, time });
  }

  /** command 是否為 recent(依時間排序)的有序子序列 */
  private isSubsequence(command: InputToken[], recent: Stamped[]): boolean {
    let i = 0;
    for (const entry of recent) {
      if (entry.token === command[i]) {
        i++;
        if (i === command.length) return true;
      }
    }
    return false;
  }
}

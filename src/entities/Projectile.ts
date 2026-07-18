import Phaser from 'phaser';
import { BALANCE } from '../config/balance';
import { MoveDef } from '../config/moves';
import { Fighter, HitInfo } from './Fighter';

/**
 * 投射物(弧光射門的光球)。
 * 由 FightScene 每幀更新;命中對手、撞牆或超出射程即消失。
 * 目前用程式繪製的光球 placeholder,未來可換成 sprite/動畫。
 */
export class Projectile {
  alive = true;
  readonly displayObjects: Phaser.GameObjects.GameObject[] = [];

  private container: Phaser.GameObjects.Container;
  private core: Phaser.GameObjects.Arc;
  private glow: Phaser.GameObjects.Arc;
  private x: number;
  private readonly y: number;
  private readonly dir: 1 | -1;
  private readonly speed: number;
  private travelled = 0;
  private readonly range: number;
  private readonly radius: number;

  constructor(
    private scene: Phaser.Scene,
    readonly owner: Fighter,
    move: MoveDef,
    private hit: HitInfo,
    startX: number,
    startY: number,
    dir: 1 | -1,
  ) {
    this.x = startX;
    this.y = startY;
    this.dir = dir;
    this.speed = move.projectileSpeed;
    this.range = move.projectileRange;
    this.radius = move.projectileRadius;

    this.glow = new Phaser.GameObjects.Arc(scene, 0, 0, this.radius * 1.9, 0, 360, false, move.projectileColor, 0.28);
    this.core = new Phaser.GameObjects.Arc(scene, 0, 0, this.radius, 0, 360, false, move.projectileColor, 0.95);
    const spark = new Phaser.GameObjects.Arc(scene, -dir * this.radius * 0.5, 0, this.radius * 0.5, 0, 360, false, 0xffffff, 0.9);
    this.container = scene.add.container(startX, startY - 60, [this.glow, this.core, spark]);
    this.container.setDepth(startY + 1);
    this.displayObjects.push(this.container);
  }

  /** 每幀更新;回傳是否仍存活 */
  update(dt: number, target: Fighter): boolean {
    if (!this.alive) return false;

    this.x += this.dir * this.speed * dt;
    this.travelled += this.speed * dt;
    this.container.setPosition(this.x, this.y - 60);
    // 光球脈動
    const pulse = 1 + Math.sin(this.scene.time.now / 60) * 0.12;
    this.glow.setScale(pulse);

    // 撞牆 / 超出射程
    if (
      this.travelled >= this.range ||
      this.x <= BALANCE.arena.wallLeft ||
      this.x >= BALANCE.arena.wallRight
    ) {
      this.destroy();
      return false;
    }

    // 命中對手
    const box = new Phaser.Geom.Rectangle(this.x - this.radius, this.y - 60 - this.radius, this.radius * 2, this.radius * 2);
    if (
      target.canBeHit() &&
      Math.abs(this.y - target.y) <= BALANCE.zTolerance &&
      Phaser.Geom.Intersects.RectangleToRectangle(box, target.getHurtbox())
    ) {
      const blocked = target.isBlocking();
      target.takeHit(this.hit, this.owner);
      (this.scene as unknown as { onFighterHit(t: Fighter, b: boolean): void }).onFighterHit(target, blocked);
      this.destroy();
      return false;
    }
    return true;
  }

  private destroy(): void {
    this.alive = false;
    this.container.destroy();
  }
}

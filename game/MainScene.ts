
import Phaser from 'phaser';
import { socketService } from '../services/SocketService';
import { GameMessage, PlayerState } from '../types';

export class MainScene extends Phaser.Scene {
  public declare add: Phaser.GameObjects.GameObjectFactory;
  public declare cameras: Phaser.Cameras.Scene2D.CameraManager;
  public declare input: Phaser.Input.InputPlugin;

  private me: Phaser.GameObjects.Container | null = null;
  private otherPlayers: Map<string, Phaser.GameObjects.Container> = new Map();
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: { [key: string]: Phaser.Input.Keyboard.Key } | null = null;
  
  private myNickname: string = '';
  private myRole: string = '';
  
  private targetPositions: Map<string, { x: number, y: number }> = new Map();
  private lastSentPos: { x: number, y: number } = { x: 0, y: 0 };
  private moveThreshold: number = 2;

  constructor() {
    super({ key: 'MainScene' });
  }

  init(data: { nickname: string, role: string }) {
    this.myNickname = data.nickname;
    this.myRole = data.role;
  }

  create() {
    const floor = this.add.graphics();
    floor.fillStyle(0x8b7355, 1);
    floor.fillRect(0, 0, 2000, 2000);
    
    this.add.grid(1000, 1000, 2000, 2000, 64, 64, 0x000000, 0, 0x5d4037, 0.2);

    this.me = this.createPlayerSprite(400, 300, this.myNickname, true);
    this.cameras.main.startFollow(this.me, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, 2000, 2000);

    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D') as any;
    }

    socketService.subscribe((msg: any) => {
      this.handleServerUpdate(msg);
    });
  }

  private createPlayerSprite(x: number, y: number, name: string, isMe: boolean): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const body = this.add.graphics();
    const color = isMe ? 0x4ade80 : 0xf87171;
    body.fillStyle(color, 1);
    body.fillRoundedRect(-20, -20, 40, 40, 8);
    body.lineStyle(2, 0xffffff, 1);
    body.strokeRoundedRect(-20, -20, 40, 40, 8);

    const label = this.add.text(0, -35, name, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5);

    container.add([body, label]);
    return container;
  }

  handleServerUpdate(data: any) {
    // 백엔드에서 온 데이터가 PlayerState DTO 구조라고 가정 (playerId 필드 확인)
    const pid = data.playerId || data.nickname; 
    if (!pid || pid === this.myNickname) return;

    if (!this.otherPlayers.has(pid)) {
      const newPlayer = this.createPlayerSprite(data.x || 0, data.y || 0, data.nickname || 'Guest', false);
      this.otherPlayers.set(pid, newPlayer);
    }
    
    if (data.x !== undefined && data.y !== undefined) {
      this.targetPositions.set(pid, { x: data.x, y: data.y });
    }
  }

  update(time: number, delta: number) {
    if (!this.me) return;

    let vx = 0;
    let vy = 0;
    const speed = 0.3 * delta;

    if (this.cursors?.left.isDown || this.wasd?.A.isDown) vx -= speed;
    if (this.cursors?.right.isDown || this.wasd?.D.isDown) vx += speed;
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) vy -= speed;
    if (this.cursors?.down.isDown || this.wasd?.S.isDown) vy += speed;

    this.me.x += vx;
    this.me.y += vy;

    const dist = Phaser.Math.Distance.Between(this.me.x, this.me.y, this.lastSentPos.x, this.lastSentPos.y);
    if (dist > this.moveThreshold) {
      // 백엔드 @MessageMapping("/update") 경로 사용
      // 백엔드 PlayerState DTO 구조에 맞춘 데이터 전송
      socketService.sendMessage('/app/update', {
        playerId: this.myNickname, // 백엔드 로직상 닉네임을 ID로 쓰는 경우가 많음
        nickname: this.myNickname,
        x: Math.round(this.me.x),
        y: Math.round(this.me.y),
        direction: vx > 0 ? "right" : vx < 0 ? "left" : "down",
        role: this.myRole.toUpperCase(),
        animState: (vx !== 0 || vy !== 0) ? "WALK" : "IDLE",
        roomId: "1"
      });
      this.lastSentPos = { x: this.me.x, y: this.me.y };
    }

    this.otherPlayers.forEach((player, id) => {
      const target = this.targetPositions.get(id);
      if (target) {
        player.x = Phaser.Math.Linear(player.x, target.x, 0.15);
        player.y = Phaser.Math.Linear(player.y, target.y, 0.15);
      }
    });
  }
}

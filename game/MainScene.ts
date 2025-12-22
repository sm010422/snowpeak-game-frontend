
import Phaser from 'phaser';
import { socketService } from '../services/SocketService';
import { GameMessage } from '../types';

export class MainScene extends Phaser.Scene {
  // Phaser 내부 시스템 객체들을 명시적으로 선언
  public declare add: Phaser.GameObjects.GameObjectFactory;
  public declare cameras: Phaser.Cameras.Scene2D.CameraManager;
  public declare input: Phaser.Input.InputPlugin;

  private me: Phaser.GameObjects.Container | null = null;
  private otherPlayers: Map<string, Phaser.GameObjects.Container> = new Map();
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: { [key: string]: Phaser.Input.Keyboard.Key } | null = null;
  
  private myId: string = Math.random().toString(36).substring(7);
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
    // 배경 설정
    const floor = this.add.graphics();
    floor.fillStyle(0x8b7355, 1);
    floor.fillRect(0, 0, 2000, 2000);
    
    this.add.grid(1000, 1000, 2000, 2000, 64, 64, 0x000000, 0, 0x5d4037, 0.2);

    // 내 캐릭터 생성
    this.me = this.createPlayerSprite(400, 300, this.myNickname, true);
    this.cameras.main.startFollow(this.me, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, 2000, 2000);

    // 입력 설정
    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D') as any;
    }

    // 소켓 구독
    socketService.subscribe((msg: GameMessage) => {
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

  handleServerUpdate(msg: GameMessage) {
    if (msg.playerId === this.myId) return;

    switch (msg.type) {
      case 'JOIN':
      case 'MOVE':
        if (!this.otherPlayers.has(msg.playerId)) {
          const newPlayer = this.createPlayerSprite(msg.x || 0, msg.y || 0, msg.nickname || 'Guest', false);
          this.otherPlayers.set(msg.playerId, newPlayer);
        }
        if (msg.x !== undefined && msg.y !== undefined) {
          this.targetPositions.set(msg.playerId, { x: msg.x, y: msg.y });
        }
        break;
      case 'LEAVE':
        const player = this.otherPlayers.get(msg.playerId);
        if (player) {
          player.destroy();
          this.otherPlayers.delete(msg.playerId);
          this.targetPositions.delete(msg.playerId);
        }
        break;
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
      socketService.sendMessage('/app/move', {
        type: 'MOVE',
        playerId: this.myId,
        x: Math.round(this.me.x),
        y: Math.round(this.me.y)
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

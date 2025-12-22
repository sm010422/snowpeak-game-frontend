
import Phaser from 'phaser';
import { socketService } from '../services/SocketService';
import { GameMessage, PlayerState } from '../types';

export class MainScene extends Phaser.Scene {
  // Explicitly declaring these to resolve TypeScript errors where inheritance isn't correctly recognized in this environment
  declare add: Phaser.GameObjects.GameObjectFactory;
  declare cameras: Phaser.Cameras.Scene2D.CameraManager;
  declare input: Phaser.Input.InputPlugin;

  private me: Phaser.GameObjects.Container | null = null;
  private otherPlayers: Map<string, Phaser.GameObjects.Container> = new Map();
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: { [key: string]: Phaser.Input.Keyboard.Key } | null = null;
  
  private myNickname: string = '';
  private myRole: string = '';
  
  private targetPositions: Map<string, { x: number, y: number }> = new Map();
  private lastSentPos: { x: number, y: number } = { x: 0, y: 0 };
  private moveThreshold: number = 2;

  // Isometric settings
  private readonly TILE_SIZE = 64;
  private readonly WORLD_SIZE = 15; // 15x15 tiles

  constructor() {
    super({ key: 'MainScene' });
  }

  init(data: { nickname: string, role: string }) {
    this.myNickname = data.nickname;
    this.myRole = data.role;
  }

  // Convert logical X,Y to Screen Isometric X,Y
  private cartesianToIso(x: number, y: number): { x: number, y: number } {
    return {
      x: (x - y),
      y: (x + y) / 2
    };
  }

  create() {
    // Dark background like the image
    this.cameras.main.setBackgroundColor('#0b0e14');

    // Create a world group for depth sorting
    const worldGroup = this.add.group();

    // 1. Create Isometric Ground (The "Island")
    const centerX = 0;
    const centerY = 0;

    for (let iy = 0; iy < this.WORLD_SIZE; iy++) {
      for (let ix = 0; ix < this.WORLD_SIZE; ix++) {
        const cartX = ix * this.TILE_SIZE;
        const cartY = iy * this.TILE_SIZE;
        const iso = this.cartesianToIso(cartX, cartY);

        const tile = this.add.graphics();
        tile.fillStyle(0x38b000, 1); // Bright green
        tile.lineStyle(1, 0x2d6a4f, 0.5);
        
        // Draw diamond
        const points = [
          { x: 0, y: -this.TILE_SIZE / 4 },
          { x: this.TILE_SIZE, y: 0 },
          { x: 0, y: this.TILE_SIZE / 4 },
          { x: -this.TILE_SIZE, y: 0 }
        ];
        tile.fillPoints(points, true);
        tile.strokePoints(points, true);
        tile.setPosition(iso.x, iso.y);
        tile.setDepth(-1000); // Always bottom
      }
    }

    // 2. Add some "3D" props (Trees, Castle placeholders)
    this.createProp(128, 128, 'TREE');
    this.createProp(256, 128, 'TREE');
    this.createProp(512, 512, 'CASTLE');
    this.createProp(64, 512, 'WINDMILL');

    // 3. Create Me
    this.me = this.createPlayerSprite(400, 300, this.myNickname, true);
    this.cameras.main.startFollow(this.me, true, 0.1, 0.1);
    this.cameras.main.setZoom(0.8);

    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D') as any;
    }

    socketService.subscribe((msg: any) => {
      this.handleServerUpdate(msg);
    });
  }

  private createProp(cartX: number, cartY: number, type: 'TREE' | 'CASTLE' | 'WINDMILL') {
    const iso = this.cartesianToIso(cartX, cartY);
    const container = this.add.container(iso.x, iso.y);
    const g = this.add.graphics();

    if (type === 'TREE') {
      // Trunk
      g.fillStyle(0x5d4037, 1);
      g.fillRect(-5, -10, 10, 20);
      // Leaves (Cone)
      g.fillStyle(0x1b4332, 1);
      g.fillTriangle(0, -60, -25, -10, 25, -10);
      g.fillTriangle(0, -45, -20, -5, 20, -5);
    } else if (type === 'CASTLE') {
      g.fillStyle(0xced4da, 1); // Stone
      g.fillRect(-40, -60, 80, 60);
      g.fillStyle(0xae2012, 1); // Red roof
      g.fillTriangle(-45, -60, 0, -100, 45, -60);
      // Towers
      g.fillStyle(0xadb5bd, 1);
      g.fillRect(-50, -80, 20, 80);
      g.fillRect(30, -80, 20, 80);
    } else {
      g.fillStyle(0x6c757d, 1);
      g.fillRect(-10, -50, 20, 50);
      g.lineStyle(4, 0xffffff, 1);
      g.lineBetween(-30, -40, 30, -20);
      g.lineBetween(-30, -20, 30, -40);
    }

    container.add(g);
    container.depth = iso.y;
  }

  private createPlayerSprite(cartX: number, cartY: number, name: string, isMe: boolean): Phaser.GameObjects.Container {
    const iso = this.cartesianToIso(cartX, cartY);
    const container = this.add.container(iso.x, iso.y);
    
    // Shadow
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.2);
    shadow.fillEllipse(0, 0, 40, 20);
    
    // Body (Isometric Block)
    const body = this.add.graphics();
    const color = isMe ? 0x4ade80 : 0xf87171;
    
    // Side
    body.fillStyle(Phaser.Display.Color.IntegerToColor(color).darken(20).color, 1);
    body.fillRect(-15, -40, 15, 40);
    // Front
    body.fillStyle(color, 1);
    body.fillRect(0, -40, 15, 40);
    // Top
    body.fillStyle(Phaser.Display.Color.IntegerToColor(color).brighten(20).color, 1);
    body.fillPoints([{x:-15, y:-40}, {x:0, y:-47}, {x:15, y:-40}, {x:0, y:-33}], true);

    const label = this.add.text(0, -60, name, {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 6, y: 3 },
    }).setOrigin(0.5);

    container.add([shadow, body, label]);
    container.setData('cartX', cartX);
    container.setData('cartY', cartY);
    container.depth = iso.y;
    
    return container;
  }

  handleServerUpdate(data: any) {
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

    let cvx = 0; // Cartesian Velocity X
    let cvy = 0; // Cartesian Velocity Y
    const speed = 0.2 * delta;

    if (this.cursors?.left.isDown || this.wasd?.A.isDown) cvx -= speed;
    if (this.cursors?.right.isDown || this.wasd?.D.isDown) cvx += speed;
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) cvy -= speed;
    if (this.cursors?.down.isDown || this.wasd?.S.isDown) cvy += speed;

    // Update logical position
    let currentCartX = this.me.getData('cartX') + cvx;
    let currentCartY = this.me.getData('cartY') + cvy;

    // Boundary check for the island
    currentCartX = Phaser.Math.Clamp(currentCartX, 0, (this.WORLD_SIZE - 1) * this.TILE_SIZE);
    currentCartY = Phaser.Math.Clamp(currentCartY, 0, (this.WORLD_SIZE - 1) * this.TILE_SIZE);

    this.me.setData('cartX', currentCartX);
    this.me.setData('cartY', currentCartY);

    // Transform to Isometric screen pos
    const iso = this.cartesianToIso(currentCartX, currentCartY);
    this.me.x = iso.x;
    this.me.y = iso.y;
    this.me.depth = iso.y; // Correct depth sorting

    const dist = Phaser.Math.Distance.Between(currentCartX, currentCartY, this.lastSentPos.x, this.lastSentPos.y);
    if (dist > this.moveThreshold) {
      socketService.sendMessage('/app/update', {
        playerId: this.myNickname,
        nickname: this.myNickname,
        x: Math.round(currentCartX),
        y: Math.round(currentCartY),
        direction: cvx > 0 ? "right" : cvx < 0 ? "left" : "down",
        role: this.myRole.toUpperCase(),
        animState: (cvx !== 0 || cvy !== 0) ? "WALK" : "IDLE",
        roomId: "1"
      });
      this.lastSentPos = { x: currentCartX, y: currentCartY };
    }

    // Update other players with smoothing
    this.otherPlayers.forEach((player, id) => {
      const target = this.targetPositions.get(id);
      if (target) {
        const curX = player.getData('cartX') || target.x;
        const curY = player.getData('cartY') || target.y;
        
        const nextX = Phaser.Math.Linear(curX, target.x, 0.15);
        const nextY = Phaser.Math.Linear(curY, target.y, 0.15);
        
        player.setData('cartX', nextX);
        player.setData('cartY', nextY);
        
        const isoOther = this.cartesianToIso(nextX, nextY);
        player.x = isoOther.x;
        player.y = isoOther.y;
        player.depth = isoOther.y;
      }
    });
  }
}

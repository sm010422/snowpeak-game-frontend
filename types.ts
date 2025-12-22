
export type PlayerRole = 'HALL_SERVER' | 'BARISTA';
export type AnimState = 'IDLE' | 'WALK';

export interface PlayerState {
  playerId: string;
  nickname: string;
  x: number;
  y: number;
  direction: string;
  role: PlayerRole;
  animState: AnimState;
  roomId: string;
}

export interface GameMessage {
  type: 'JOIN' | 'MOVE' | 'LEAVE' | 'CHAT';
  playerId: string;
  nickname?: string;
  role?: PlayerRole | string;
  x?: number;
  y?: number;
  content?: string;
  // 백엔드 PlayerState와 호환을 위한 필드들
  direction?: string;
  animState?: AnimState;
  roomId?: string;
}

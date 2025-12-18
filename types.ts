
export type PlayerRole = 'HALL_SERVER' | 'BARISTA';

export interface PlayerState {
  id: string;
  nickname: string;
  role: PlayerRole;
  x: number;
  y: number;
  lastUpdate: number;
}

export interface GameMessage {
  type: 'JOIN' | 'MOVE' | 'LEAVE' | 'CHAT';
  playerId: string;
  nickname?: string;
  role?: PlayerRole;
  x?: number;
  y?: number;
  content?: string;
}

export interface SocketEvent {
  type: string;
  data: any;
}

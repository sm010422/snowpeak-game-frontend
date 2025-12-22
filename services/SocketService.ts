
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { GameMessage } from '../types';

class SocketService {
  private client: Client | null = null;
  private subscribers: ((msg: GameMessage) => void)[] = [];
  private static instance: SocketService;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(nickname: string, role: string, onConnected: () => void, onError: (err: any) => void) {
    // 백엔드 서버 주소를 http://localhost:8080/ws 로 설정 (표준적인 WebSocket 경로)
    const socket = new SockJS('http://localhost:8080/ws');
    
    this.client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log('[STOMP] ' + str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = (frame) => {
      console.log('Connected to Snowpeak Backend: ' + frame);
      
      // 게임방 구독 (예시: room.1)
      this.client?.subscribe('/topic/room.1', (message: Message) => {
        try {
          const payload: GameMessage = JSON.parse(message.body);
          this.notifySubscribers(payload);
        } catch (e) {
          console.error('Failed to parse message', e);
        }
      });

      // 초기 참여 메시지 전송
      this.sendMessage('/app/join', {
        type: 'JOIN',
        nickname,
        role,
        x: 400,
        y: 300
      });

      onConnected();
    };

    this.client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      onError(frame.headers['message']);
    };

    this.client.onWebSocketClose = () => {
      console.warn('WebSocket Connection Closed');
    };

    this.client.activate();
  }

  public disconnect() {
    if (this.client) {
      this.client.deactivate();
    }
  }

  public sendMessage(destination: string, body: any) {
    if (this.client && this.client.connected) {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
      });
    } else {
      console.warn('Cannot send message: Not connected to server');
    }
  }

  public subscribe(callback: (msg: GameMessage) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  private notifySubscribers(msg: GameMessage) {
    this.subscribers.forEach(callback => callback(msg));
  }
}

export const socketService = SocketService.getInstance();

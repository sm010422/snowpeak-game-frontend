
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
    // 백엔드 WebSocketConfig의 registry.addEndpoint("/ws-snowpeak")에 맞춤
    const socket = new SockJS('http://localhost:8080/ws-snowpeak');
    
    this.client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log('[STOMP] ' + str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = (frame) => {
      console.log('Connected to Snowpeak Backend');
      
      // 방 구독 (백엔드 destination: /topic/room.1)
      this.client?.subscribe('/topic/room.1', (message: Message) => {
        try {
          const payload = JSON.parse(message.body);
          // 백엔드에서 PlayerState 객체가 바로 넘어오므로 적절히 처리
          this.notifySubscribers(payload);
        } catch (e) {
          console.error('Failed to parse message', e);
        }
      });

      // 개인 큐 구독 (기존 플레이어 정보 수신용)
      this.client?.subscribe('/user/queue/players', (message: Message) => {
        try {
          const payload = JSON.parse(message.body);
          this.notifySubscribers(payload);
        } catch (e) {
          console.error('Failed to parse user queue message', e);
        }
      });

      // JOIN 메시지 전송 (백엔드 @MessageMapping("/join"))
      this.sendMessage('/app/join', {
        type: 'JOIN',
        nickname,
        role: role.toUpperCase(),
        x: 400,
        y: 300
      });

      onConnected();
    };

    this.client.onStompError = (frame) => {
      onError(frame.headers['message']);
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
    }
  }

  public subscribe(callback: (msg: any) => void) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }

  private notifySubscribers(msg: any) {
    this.subscribers.forEach(callback => callback(msg));
  }
}

export const socketService = SocketService.getInstance();

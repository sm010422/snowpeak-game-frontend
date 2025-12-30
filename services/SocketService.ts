
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { GameMessage } from '../types';

class SocketService {
  private client: Client | null = null;
  private subscribers: ((msg: any) => void)[] = [];
  private static instance: SocketService;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public connect(nickname: string, role: string, onConnected: () => void, onError: (err: any) => void) {
    // 백엔드 엔드포인트: /ws-snowpeak
    const socket = new SockJS('http://localhost:8080/ws-snowpeak');
    
    this.client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log('[STOMP] ' + str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      // SockJS를 사용할 때 필요한 프로토콜 호환성 설정
      onConnect: (frame) => {
        console.log('STOMP Connected');
        
        // 1. 공통 룸 구독
        this.client?.subscribe('/topic/room.1', (message: Message) => {
          try {
            const payload = JSON.parse(message.body);
            this.notifySubscribers(payload);
          } catch (e) {
            console.error('Message Parse Error', e);
          }
        });

        // 2. 개인 큐 구독 (신규 접속 시 기존 플레이어 목록 수신용)
        this.client?.subscribe('/user/queue/players', (message: Message) => {
          try {
            const payload = JSON.parse(message.body);
            this.notifySubscribers(payload);
          } catch (e) {
            console.error('Queue Parse Error', e);
          }
        });

        // 3. 접속 메시지 전송 (@MessageMapping("/join"))
        this.sendMessage('/app/join', {
          nickname: nickname,
          role: role.toUpperCase(),
          x: 400,
          y: 300
        });

        onConnected();
      },
      onStompError: (frame) => {
        console.error('STOMP Error:', frame);
        onError(frame.headers['message']);
      }
    });

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

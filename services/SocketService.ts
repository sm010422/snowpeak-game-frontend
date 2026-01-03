import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class SocketService {
  public client: Client | null = null;
  private static instance: SocketService;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // 1. 연결 함수 (심플하게 변경)
  public connect(url: string, onConnected: () => void, onError: (err: any) => void) {
    // 이미 연결되어 있으면 바로 콜백 실행
    if (this.client && this.client.connected) {
      onConnected();
      return;
    }

    const socket = new SockJS(url); // 예: 'http://localhost:8080/ws-snowpeak'
    
    this.client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log('[STOMP] ' + str),
      reconnectDelay: 5000,
      
      onConnect: () => {
        console.log('✅ STOMP 연결 성공!');
        onConnected(); // 연결 되자마자 게임컨테이너한테 알림!
      },
      
      onStompError: (frame) => {
        console.error('❌ STOMP 에러:', frame);
        onError(frame.headers['message']);
      }
    });

    this.client.activate();
  }

  // 2. 구독 함수 (토픽, 콜백 받음)
  public subscribe(topic: string, callback: (msg: any) => void) {
    if (!this.client || !this.client.connected) {
      console.warn('⚠️ 소켓이 연결되지 않아 구독 실패:', topic);
      return () => {};
    }

    const subscription = this.client.subscribe(topic, (message) => {
      if (message.body) {
        try {
          const body = JSON.parse(message.body);
          callback(body);
        } catch (e) {
          console.error('JSON 파싱 에러:', e);
        }
      }
    });

    return () => subscription.unsubscribe();
  }

  // 3. 전송 함수
  public sendMessage(destination: string, body: any) {
    if (this.client && this.client.connected) {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
      });
    } else {
      console.warn('⚠️ 전송 실패 (연결 안됨):', destination);
    }
  }

  public disconnect() {
    if (this.client) {
      this.client.deactivate();
      console.log('🔌 연결 해제');
    }
  }
}

export const socketService = SocketService.getInstance();

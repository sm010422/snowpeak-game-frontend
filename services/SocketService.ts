import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

class SocketService {
  public client: Client | null = null;
  private static instance: SocketService;

  private constructor() {}
  private pendingSubscriptions: Array<{ topic: string; callback: (msg: any) => void }> = [];

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
      // debug: (str) => console.log('[STOMP] ' + str),
      reconnectDelay: 5000,
      
      onConnect: () => {
        console.log('✅ STOMP 연결 성공!');

        if (this.pendingSubscriptions.length > 0) {
            console.log(`🔄 대기 중이던 구독 ${this.pendingSubscriptions.length}개 일괄 처리 중...`);
            this.pendingSubscriptions.forEach((sub) => {
                // 재귀 호출하지만, 이제 연결된 상태니 바로 구독됨
                this.subscribe(sub.topic, sub.callback); 
            });
            this.pendingSubscriptions = []; // 대기열 비우기
        }

        onConnected(); // [유지] 게임컨테이너한테 "이제 JOIN 보내도 돼!" 알림
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
      // 1. 클라이언트 객체가 없으면 아예 실행 불가 (안전장치)
      if (!this.client || !this.client.connected) {
            console.log(`⏳ 연결 대기 중... 구독 예약됨: ${topic}`);
            this.pendingSubscriptions.push({ topic, callback });
            return () => {}; // 나중에 연결되면 자동으로 구독됨
      }

      // 2. [수정됨] connected 체크를 제거했습니다. 
      // onConnect 안에서 호출했다면, connected가 false라고 떠도 실제론 연결된 상태입니다.
      // 라이브러리를 믿고 일단 try 블록으로 진입시킵니다.

      try {
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

          console.log(`✅ 구독 성공: ${topic}`);
          return () => subscription.unsubscribe();

      } catch (error) {
          // 여기서 진짜 연결 안 된 상황을 잡아냅니다. 앱이 멈추지 않습니다.
          console.error(`❌ 구독 실패 (연결 미완료 예상): ${topic}`, error);
          return () => {};
      }
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

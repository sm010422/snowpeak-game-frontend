
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

  public connect(nickname: string, role: string, onConnected: () => void) {
    const socket = new SockJS('http://localhost:8080/ws-snowpeak');
    this.client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => console.log(str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = (frame) => {
      console.log('Connected: ' + frame);
      
      this.client?.subscribe('/topic/room.1', (message: Message) => {
        const payload: GameMessage = JSON.parse(message.body);
        this.notifySubscribers(payload);
      });

      // Send initial join message
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
      console.error('Additional details: ' + frame.body);
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

import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: true,
        proxy: {
              // '/ws'로 시작하는 요청은 8080번 포트로 보냄
              '/ws-snowpeak': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                ws: true, // WebSocket 프로토콜 지원 설정 (중요!)
              },
              // 만약 API 요청도 있다면
              '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
              }
            }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

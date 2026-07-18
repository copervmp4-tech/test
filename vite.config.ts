import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true, // 讓同一個 Wi-Fi 下的手機可以用電腦 IP 連進來
    port: 5173,
  },
});

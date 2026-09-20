import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import os from 'os'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'network-ip-api',
      configureServer(server) {
        server.middlewares.use('/api/network-ip', (req, res) => {
          const ifaces = os.networkInterfaces();
          const ips = [];
          for (const name of Object.keys(ifaces)) {
            for (const net of ifaces[name]) {
              if (net.family === 'IPv4' && !net.internal) {
                ips.push({ interface: name, ip: net.address });
              }
            }
          }
          const primaryIp = ips.length > 0 ? ips[0].ip : '10.56.62.126';
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ip: primaryIp, allIps: ips }));
        });
      }
    }
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/ws': {
        target: 'http://localhost:8080',
        ws: true
      }
    },
    watch: {
      ignored: ['**/backend/**']
    }
  }
})

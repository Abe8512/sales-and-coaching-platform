import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/transcribe': {
        target: 'https://api.openai.com/v1/audio/transcriptions',
        changeOrigin: true,
        rewrite: (path) => '',
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Ensure Content-Type is properly passed and maintained for multipart form uploads
            const contentType = req.headers['content-type'];
            console.log('Proxy Request Content-Type:', contentType);
            
            // Enhanced content type validation - ensure we're sending audio files
            if (contentType) {
              // If content type contains text/plain, reject immediately
              if (contentType.includes('text/plain')) {
                console.error('Rejecting text/plain content type - Whisper API requires audio files');
                _res.statusCode = 415; // Unsupported Media Type
                _res.end(JSON.stringify({
                  error: {
                    message: 'Content-Type not acceptable: text/plain. The Whisper API requires audio file formats.'
                  }
                }));
                return;
              }
              
              // Set the content type header
              proxyReq.setHeader('Content-Type', contentType);
              console.log('Setting proxy request Content-Type:', contentType);
              
              // Add additional validation for multipart form data
              if (contentType.includes('multipart/form-data')) {
                console.log('Detected multipart form data - ensuring audio file is included');
              }
            } else {
              console.error('No Content-Type header found in request');
              _res.statusCode = 400;
              _res.end(JSON.stringify({
                error: {
                  message: 'Missing Content-Type header'
                }
              }));
              return;
            }
            
            // Pass Authorization header
            const authHeader = req.headers['authorization'];
            if (authHeader) {
              proxyReq.setHeader('Authorization', authHeader);
              console.log('Setting proxy request Authorization header');
            } else {
              console.error('Missing Authorization header');
              _res.statusCode = 401;
              _res.end(JSON.stringify({
                error: {
                  message: 'Missing API key. Please provide a valid OpenAI API key.'
                }
              }));
              return;
            }
            
            console.log('Proxying request to Whisper API');
          });
        }
      }
    }
  }
}); 
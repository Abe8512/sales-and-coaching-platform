import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
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
                
                // For multipart requests, try to check the file content/type
                // This requires more complex parsing which is challenging in this middleware context
                // Instead, we'll rely on the client-side validation in WhisperService.ts
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
          
          // Log proxy response
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            const statusCode = proxyRes.statusCode || 0;
            console.log(`Proxy response from Whisper API: ${statusCode}`);
            
            // Log headers for debugging
            const headers = proxyRes.headers;
            console.log('Response headers:', JSON.stringify(headers, null, 2));
            
            // Handle error responses
            if (statusCode >= 400) {
              let responseBody = '';
              
              proxyRes.on('data', (chunk) => {
                responseBody += chunk;
              });
              
              proxyRes.on('end', () => {
                try {
                  console.error('Whisper API error response:', responseBody);
                } catch (e) {
                  console.error('Error parsing API response:', e);
                }
              });
            }
          });
          
          // Log proxy errors
          proxy.on('error', (err, _req, _res) => {
            console.error('Proxy error:', err);
          });
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

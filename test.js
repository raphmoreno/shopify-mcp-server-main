import { spawn } from 'child_process';
import { createReadStream } from 'fs';

const server = spawn('node', ['build/index.js']);

let buffer = '';

// Handle server output
server.stdout.on('data', (data) => {
  const chunk = data.toString();
  buffer += chunk;

  // Process complete messages
  const messages = buffer.split('\n').filter(msg => msg.trim());
  buffer = messages.pop() || ''; // Keep the last incomplete message in the buffer

  messages.forEach(msg => {
    try {
      const response = JSON.parse(msg);
      console.log('Server response:', JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('Raw message:', msg);
    }
  });
});

server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

// Read and send the test request
const testRequest = {
  type: "request",
  id: "1",
  tool: "get_products",
  args: {
    limit: 10
  }
};

// Send the request
server.stdin.write(JSON.stringify(testRequest) + '\n');

// Handle server exit
server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
}); 
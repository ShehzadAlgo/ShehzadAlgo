const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Hello Shehzad!');
});
server.listen(18789, '127.0.0.1', () => {
  console.log('✅ Test server running on port 18789');
});

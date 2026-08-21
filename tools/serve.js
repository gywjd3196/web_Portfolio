/* 로컬 확인용 초간단 정적 서버 — "사이트 열기.bat" 가 실행한다.
   file:// 로 index.html 을 직접 열면 브라우저 보안 정책 때문에
   PDF(pdf.js fetch)와 Adobe Fonts 가 차단되므로 반드시 이걸로 연다. */
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const PORT = 8741;
const MIME = {
  '.html':'text/html', '.css':'text/css', '.js':'text/javascript',
  '.pdf':'application/pdf', '.png':'image/png', '.svg':'image/svg+xml', '.ttf':'font/ttf'
};
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  const p = path.join(ROOT, rel);
  if (!p.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }  // 상위 경로 차단
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') { console.log('이미 실행 중 — 브라우저만 열립니다.'); process.exit(0); }
  throw e;
});
server.listen(PORT, () => console.log('포트폴리오 서버 실행 중: http://localhost:' + PORT + '  (창을 닫으면 종료)'));

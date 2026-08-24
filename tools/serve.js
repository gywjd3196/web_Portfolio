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
  fs.stat(p, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
    const type = MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';

    /* Range(206) 지원 — pdf.js 가 20MB PDF 전체를 받기 전에 필요한 조각만
       가져와 첫 페이지를 그릴 수 있다.
       ponytail: 단일 범위만 처리 — 다중 범위(bytes=a-b,c-d)는 200 전체 응답으로 폴백 */
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (m && (m[1] || m[2])) {
      const start = m[1] ? +m[1] : Math.max(0, st.size - +m[2]);          // 'bytes=-N' 은 꼬리 N바이트
      const end   = m[1] && m[2] ? Math.min(+m[2], st.size - 1) : st.size - 1;
      if (start >= st.size || start > end) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + st.size }); res.end(); return;
      }
      res.writeHead(206, {
        'Content-Type': type, 'Accept-Ranges': 'bytes',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + st.size,
        'Content-Length': end - start + 1
      });
      fs.createReadStream(p, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': st.size });
    fs.createReadStream(p).pipe(res);
  });
});
server.on('error', e => {
  if (e.code === 'EADDRINUSE') { console.log('이미 실행 중 — 브라우저만 열립니다.'); process.exit(0); }
  throw e;
});
server.listen(PORT, () => console.log('포트폴리오 서버 실행 중: http://localhost:' + PORT + '  (창을 닫으면 종료)'));

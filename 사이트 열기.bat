@echo off
rem 포트폴리오를 로컬 서버로 연다 — index.html 을 직접(file://) 열면 PDF·폰트가 차단됨
start "" http://localhost:8741/
node "%~dp0tools\serve.js"

@echo off
title Portfolio Dashboard
cd /d "%~dp0"
echo กำลังเปิด Portfolio Dashboard...
start "" "http://localhost:5173"
npm run dev

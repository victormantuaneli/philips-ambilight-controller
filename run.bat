@echo off
title Philips Ambilight Controller
echo Starting Ambilight Controller...
start http://127.0.0.1:8765
python server.py
pause

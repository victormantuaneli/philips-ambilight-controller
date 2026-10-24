#!/usr/bin/env bash
echo "Starting Ambilight Controller on http://127.0.0.1:8765..."
python3 server.py &
sleep 1
if which xdg-open > /dev/null; then
    xdg-open http://127.0.0.1:8765
elif which open > /dev/null; then
    open http://127.0.0.1:8765
fi
wait

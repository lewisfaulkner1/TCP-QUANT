@echo off
rem TCP bridge: double-click to start it. It asks for the private key's passphrase, then reads
rem connected members' MT5 accounts every 30 minutes until this window is closed.
cd /d "%~dp0"
py -3 tcp_bridge.py
pause

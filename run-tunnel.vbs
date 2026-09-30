Set WshShell = CreateObject("WScript.Shell")
strDir = "c:\Users\User\Downloads\Community Power Interruption Reporting, Verification, and Information Management System for Valencia City, Bukidnon"
WshShell.CurrentDirectory = strDir
WshShell.Run "cmd /c cloudflared.exe tunnel --url http://127.0.0.1:4000 --logfile tunnel.log", 0, False

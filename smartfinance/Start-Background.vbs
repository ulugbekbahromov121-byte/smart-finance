Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strPath
WshShell.Run "cmd.exe /c ""node scripts\run-all.mjs""", 0, False
Set WshShell = Nothing
Set fso = Nothing

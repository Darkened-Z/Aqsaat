Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
WshShell.Run chr(34) & fso.GetParentFolderName(WScript.ScriptFullName) & "\start-aqsat.bat" & chr(34), 0
Set WshShell = Nothing

' Creates a desktop shortcut for MCP Chat Server
' Uses the script's own directory as the target

Set WshShell = WScript.CreateObject("WScript.Shell")
Set fso = WScript.CreateObject("Scripting.FileSystemObject")

' Get the directory where this script is located
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

strDesktop = WshShell.SpecialFolders("Desktop")
Set oShortcut = WshShell.CreateShortcut(strDesktop & "\MCP Chat Server.lnk")
oShortcut.TargetPath = fso.BuildPath(scriptDir, "start-chat.bat")
oShortcut.WorkingDirectory = scriptDir
oShortcut.Description = "Start MCP Chat Server for LM Studio"
oShortcut.Save
WScript.Echo "Desktop shortcut created!"

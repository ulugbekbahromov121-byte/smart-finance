import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

const startupFolder = path.join(
  process.env.APPDATA,
  'Microsoft',
  'Windows',
  'Start Menu',
  'Programs',
  'Startup'
);

const vbsScript = 'c:\\Users\\U.S\\Desktop\\Miniapp\\Start-Background.vbs';
const workingDir = 'c:\\Users\\U.S\\Desktop\\Miniapp';
const shortcutPath = path.join(startupFolder, 'SmartFinance-AutoStart.lnk');

const psCommand = `
$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut('${shortcutPath.replace(/\\/g, '\\\\')}')
$sc.TargetPath = 'wscript.exe'
$sc.Arguments = '\"${vbsScript.replace(/\\/g, '\\\\')}\"'
$sc.WorkingDirectory = '${workingDir.replace(/\\/g, '\\\\')}'
$sc.WindowStyle = 7
$sc.Save()
`;

execSync(`powershell -NoProfile -Command "${psCommand.replace(/\n/g, '; ')}"`, { stdio: 'inherit' });
console.log('Successfully installed shortcut to Startup:', shortcutPath);

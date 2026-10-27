import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const ZIP_PATH = path.join(process.env.USERPROFILE, 'Desktop', 'SmartFinance-Deploy.zip');

if (fs.existsSync(ZIP_PATH)) {
  fs.unlinkSync(ZIP_PATH);
}

const psCmd = `
$exclude = @('node_modules', '.next', 'cloudflared.exe', '*.zip', 'data', '.git', '.gemini');
$files = Get-ChildItem -Path '.' -Exclude $exclude;
Compress-Archive -Path $files -DestinationPath '${ZIP_PATH.replace(/\\/g, '\\\\')}' -Force
`;

try {
  execSync(`powershell -NoProfile -Command "${psCmd.replace(/\n/g, ' ')}"`, { stdio: 'inherit' });
  const stats = fs.statSync(ZIP_PATH);
  console.log(`Success! Archive created at: ${ZIP_PATH} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
} catch (e) {
  console.error('Archive error:', e);
}

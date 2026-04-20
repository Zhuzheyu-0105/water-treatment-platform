// Install pnpm globally
const { execSync } = require('child_process');

const nodePath = 'C:\\Users\\zzy\\.workbuddy\\binaries\\node\\versions\\22.12.0.installing.10148.__extract_temp__\\node-v22.12.0-win-x64\\node.exe';

console.log('Installing pnpm globally...');
try {
  execSync(`${nodePath} -e "require('child_process').execSync('npm install -g pnpm@9.0.0', {stdio: 'inherit'})"`, {
    stdio: 'inherit'
  });
} catch (e) {
  console.error('Failed:', e.message);
}

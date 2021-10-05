const { execSync } = require('child_process');

module.exports = (phase, { defaultConfig }) => {
  if (phase == 'phase-production-server') {
    // Will run during production deploys and previews
    const storkStdout = execSync('./stork.sh')
    console.log(storkStdout)
  }
  return defaultConfig
}

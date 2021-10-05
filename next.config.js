const { execSync } = require('child_process');
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

module.exports = (phase, { defaultConfig }) => {
  if (phase == PHASE_PRODUCTION_SERVER) {
    // Will run during production deploys and previews
    const storkStdout = execSync('./stork.sh')
  }
  return defaultConfig
}

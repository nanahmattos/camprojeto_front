// O Smart App Control do Windows bloqueia o dart.exe do sass-embedded ("spawn UNKNOWN").
// Sem o sass-embedded, o Vite usa o pacote "sass" (JavaScript puro), que funciona normalmente.
const fs = require('fs')
const path = require('path')

const nodeModules = path.join(__dirname, '..', 'node_modules')
for (const name of fs.readdirSync(nodeModules)) {
  if (name === 'sass-embedded' || name.startsWith('sass-embedded-')) {
    fs.rmSync(path.join(nodeModules, name), { recursive: true, force: true })
  }
}

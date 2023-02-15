// Creates a note in ./notes/ with the schema `${TIMESTAMP}.md`

const fs = require('fs')
const path = require('path')
const notesDir = './notes'

if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir);
}

const filepath = path.join(notesDir, `${Date.now()}.md`)
fs.writeFileSync(filepath, '')

// This can be cmd+clicked from VS Code's terminal to open/edit it!
console.log(filepath)

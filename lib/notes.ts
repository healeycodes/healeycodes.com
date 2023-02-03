import fs from 'fs'
import matter from 'gray-matter';
import path from "path"

const NOTES_DIRECTORY = path.join(process.cwd(), "notes")

export type Note = {
    id: number,
    content: string,
}

export function getAllNotes(): Note[] {
    const fileNames = fs.readdirSync(NOTES_DIRECTORY)
    const notes: Note[] = []

    fileNames.forEach((fileName) => {
        const id = parseInt(fileName.split('.md')[0], 10)

        // Some very light validation
        // @ts-ignore
        if (new Date(id) == 'Invalid Date') {
            throw `${id} isn't a valid date!`
        }

        const fullPath = path.join(NOTES_DIRECTORY, `${id}.md`);
        const fileContents = fs.readFileSync(fullPath, "utf8");
        const matterResult = matter(fileContents)
        notes.push({
            id: id,
            content: matterResult.content
        })
    })

    notes.sort((a, z) => z.id - a.id)
    return notes
}

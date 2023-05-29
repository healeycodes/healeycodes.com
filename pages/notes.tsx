import Markdown from "markdown-to-jsx";
import React from "react";
import Code from "../components/code";
import Layout from "../components/layout";
import { getAllNotes, Note } from "../lib/notes";


export async function getStaticProps() {
    const notes = getAllNotes()
    return {
        props: {
            notes
        },
    };
}

export default function Notes({ notes }: { notes: Note[] }) {
    const seo = { title: 'Notes', description: 'Shorter writing.' };

    return (
        <Layout {...seo}>
            <h1>Notes</h1>
            <p className="notes-intro">This is a new page I'm trying out. I'll put shorter content here; thoughts and ideas that aren't full posts.
            </p>
            <main>
                {
                    notes
                        .map((note) => <div key={note.id} id={note.id.toString()} className="note">
                            <p>
                                <a className="note-date-link" href={`#${note.id}`}>{(new Date(note.id)).toDateString()}</a>
                            </p>
                            <Markdown
                                options={{
                                    createElement(type, props, children) {
                                        if (type === "code" && props.className) {
                                            const language = props.className.replace("lang-", "");
                                            return <Code children={children} language={language} />;
                                        }
                                        return React.createElement(type, props, children);
                                    },
                                }}
                            >{note.content}</Markdown>
                            <hr />
                        </div>)
                }
            </main>
            <style jsx>{`
            .notes-intro {
                padding-bottom: 24px;
            }
            .note-date-link {
                color: var(--light-text);
                margin-right: 20px;
            }
            .note-date-link:hover {
                color: var(--text);
            }
            `}</style>
        </Layout>
    )
}

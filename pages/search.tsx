import Head from 'next/head'
import Link from 'next/link'
import Script from 'next/script'

import Layout from "../components/layout";

export default function About() {
    return (
        <Layout title="Search" description="Search articles">
            <Head>
                <link rel="stylesheet" href="https://files.stork-search.net/basic.css" />
            </Head>
            <h1>Search</h1>
            <p>I'm currently prototyping this search page, powered by <a href="https://github.com/jameslittle230/stork">Stork</a>.</p>
            <p>I've written about Stork in <Link href="/webassembly-search-tools-for-static-websites">WebAssembly Search Tools for Static Sites</Link>.</p>
            <main>
                <div className="stork-wrapper">
                    <input placeholder="Search all posts.." data-stork="posts" className="stork-input" />
                    <div data-stork="posts-output" className="stork-output"></div>
                </div>
                <Script
                    src="https://files.stork-search.net/stork.js"
                    // @ts-ignore
                    onLoad={() => window.stork.register(
                        'posts',
                        'stork-posts.st'
                    )}
                />
            </main>
            <p>Do let me know about bugs, UX, performance issues, etc.</p>
        </Layout >
    );
}

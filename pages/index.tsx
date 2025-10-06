import siteConfig from "../siteConfig.json";
import mePresenting from "../public/assets/presenting-high-res.jpg";

import Image from "next/image";
import Link from "next/link";

import Layout from "../components/layout";
import Newsletter from "../components/newsletter";

import { getSortedPostsData, getPostData } from "../lib/posts";
import { generateRssFeed } from "../lib/rss";
import { getAllNotes } from "../lib/notes";

import { Fibonacci } from "../components/visuals/icepath/components";

export async function getStaticProps() {
  await generateRssFeed();

  const allPostsData = getSortedPostsData();
  // Count posts
  const words = allPostsData.reduce(
    (count, current) =>
      count + getPostData(current.id).content.split(" ").length,
    0
  ) +
    // Count notes
    getAllNotes().reduce((count, current) => count + current.content.split(" ").length, 0)
  return {
    props: {
      allPostsData,
      description: siteConfig.SITE_DESC,
      words,
    },
  };
}

export default function Home({ allPostsData, description, words }) {
  function numberWithCommas(x: number) {
    // https://stackoverflow.com/a/2901298
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  return (
    <Layout title="Blog" description={description}>
      <main>
        <div className="intro">
          <h1>Intro</h1>
          <p>
            Hello and welcome to my website. I'm a software engineer who writes about software. I've
            written {numberWithCommas(words)} words
            across <Link href="/articles">{allPostsData.length} articles</Link> on
            this <a href={siteConfig.REPO_URL}>open source</a> website. These
            articles have reached the front page of Hacker
            News <a href="https://hn.algolia.com/?dateRange=all&page=0&prefix=false&query=healeycodes.com%20-queuedle&sort=byPopularity&type=story">20 times</a>.
          </p>
          <p>
            I've worked at Vercel since 2021, mostly on the distributed build pipeline that runs untrusted customer code, as well as on the underlying ephemeral compute platform.
          </p>
          {/* Maybe link to latest? */}
          {/* <p>
            My latest article is <Link href={`/${allPostsData[0].id}`}>{allPostsData[0].title}</Link>.
          </p> */}
          <p>
            I enjoy understanding how things work and making them faster. Like how SIMD can make some programs <Link href="/counting-words-at-simd-speed">orders of magnitude quicker</Link>.
          </p>
          <p>
            I wrote <Link href="/maybe-the-fastest-disk-usage-program-on-macos">one of the fastest disk-usage programs on macOS</Link> by
            using macOS-specific system calls, and then
            made it faster by <Link href="/optimizing-my-disk-usage-program">reducing thread scheduling overhead and lock contention</Link>. I
            also showed how to beat the performance of <code>grep</code> by just <Link href="/beating-grep-with-go">using goroutines</Link>.
          </p>
          <p>
            My <Link href="/installing-npm-packages-very-quickly">experimental package manager</Link> uses simple concurrency patterns to be faster than every package manager aside from Bun (which is 11% faster) when cold-installing from a lockfile.
          </p>
          <p>
            I've created a few small programming languages and related tools, including a <Link href="/compiling-a-forth"> Forth compiler</Link>, a <Link href="/lisp-to-javascript-compiler">Lisp-to-JavaScript compiler</Link>, which I turned into an <Link href="/lisp-compiler-optimizations">optimizing compiler</Link>, and for which I wrote a <Link href="/compiling-lisp-to-bytecode-and-running-it">bytecode VM</Link>.
            I also built an <Link href="/adding-for-loops-to-an-interpreter">interpreted language</Link> with a C-style syntax, which I <Link href="/profiling-and-optimizing-an-interpreter">profiled and made faster</Link>; I later added a <Link href="/a-custom-webassembly-compiler">WebAssembly compiler</Link> and a <Link href="/adding-a-line-profiler-to-my-language">line profiler</Link>. I also <Link href="/porting-boolrule-to-rust">ported an expression engine</Link> to Rust.
          </p>
          <p>
            Below, you can see my <Link href="/icepath-a-2d-programming-language">2D programming language</Link> calculating the first ten numbers in the Fibonacci sequence.
          </p>
          <Fibonacci />
          <p>
            I really enjoy games (chess, scrabble, sudoku), puzzles, and solvers. I built my <Link href="/building-my-own-chess-engine">own chess engine</Link>, and created visualizations for understanding <Link href="/visualizing-chess-bitboards">how bitboards can be used to store chess game state</Link>. I wrote about <Link href="/building-game-prototypes-with-love">building game prototypes in Lua</Link>, how to <Link href="/2d-multiplayer-from-scratch">build 2D multiplayer from scratch</Link>, a daily puzzle game I designed called <Link href="/how-i-made-queuedle">Queuedle</Link>, a <Link href="/solving-queuedle">solver for it</Link>, and some <Link href="/generating-mazes">maze generation algorithms</Link>.
          </p>
          <p>
            My favorite solver I've worked on is <Link href="/building-and-solving-sokoban">for Sokoban</Link>.
          </p>
          <p>
            I'm a big fan of classic FPS games like Quake and Counter-Strike. I worked on a tool to <Link href="/rendering-counter-strike-demos-in-the-browser">analyze Counter-Strike demos in the browser</Link>, and a program that <Link href="/compressing-cs2-demos">compresses Counter-Strike demos by 13×</Link>.
          </p>
          <p>
            I did a <Link href="/my-time-at-the-recurse-center">six-week batch at the Recurse Center</Link> where I worked on many projects and paired with many excellent programmers. One of the projects I worked on was a text editor that I <Link href="/making-a-text-editor-with-a-game-engine">built using a game engine</Link>, and to which I <Link href="/implementing-highlighting-search-and-undo">added highlighting, search, and undo</Link>.
          </p>
          <p>
            I've written about <Link href="/sandboxing-javascript-code">how to sandbox JavaScript</Link> using Deno, how to <Link href="/running-untrusted-python-code">sandbox Python using seccomp</Link>, and how to take over the <code>getrandom</code> system call <Link href="/making-python-less-random">using ptrace</Link>.
          </p>
          <p>
            I'd like to write more about AI. I recently created <Link href="/filesystem-backed-by-an-llm">a FUSE filesystem where file operations are handled by an LLM</Link>.
          </p>
          <Image
            src={mePresenting}
            placeholder="blur"
            alt="Presenting: When Does Development Spark Joy? Sentimental analysis of commit messages."
            quality={100}
            priority={true}
            style={{ borderRadius: '0.4em', width: '100%', height: 'auto' }}
          />
          <p>
            I live in the UK with my wife, our three young children, and a cat called Moose.
          </p>
          <p>
            Technical books I recommend include <i>Crafting Interpreters</i> and <i>The Computational Beauty of Nature</i>. For general fiction, I recommend the authors Patricia Lockwood and Ben Lerner. For sci-fi, I recommend the <i>Dune</i> series (1-6 are amazing, 7-9 are good) and the <i>Remembrance of Earth's Past</i> trilogy. For non-fiction, I recommend <i>The Orchid Thief</i> and <i>Nothing to Envy</i>.
          </p>
          <p>
            I love getting email and you can reach me by running the following code in your browser's developer console: <code>atob('aGVhbGV5Y29kZXNAZ21haWwuY29t')</code>.
          </p>
        </div>
      </main>
      <footer>
        <Newsletter />
      </footer>
      <style jsx>{`
        .intro {
          padding-bottom: 20px;
        }
        .posts {
          display: flex;
        }
        .posts-section {
          flex: 1;
          padding-right: 20px;
        }

        @media only screen and (max-width: ${siteConfig.LAYOUT_WIDTH}px) {
          .posts {
            display: block;
          }
          .posts-section {
            padding-right: 0px;
          }
        }
      `}</style>
    </Layout>
  );
}

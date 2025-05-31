import siteConfig from "../siteConfig.json";
import mePresenting from "../public/assets/presenting-high-res.jpg";

import SpacedImage from "../components/image";
import Layout from "../components/layout";
import Link from "next/link";

export default function About() {
  const daysSince1stJan2019 = Math.floor((new Date().getTime() - new Date("2019-01-01").getTime()) / (1000 * 60 * 60 * 24));
  return (
    <Layout title="About" description="About me.">
      <h1>About</h1>
      <main>
        <p>
          I write software and write about software. My research interests include programming language design, compilers, puzzle/game solvers, and distributed systems.</p>
        <p>
          This <a href={siteConfig.REPO_URL}>open source</a> website is built with Next.js and is {daysSince1stJan2019} days old – some of the development is covered in <Link href="/notes">my notes</Link>. The very first version was built with Jekyll.
        </p>
        <p>
          Feel free to <a href="mailto:healeycodes@gmail.com">email me</a> with any questions or comments.
        </p>
        <SpacedImage
          src={mePresenting}
          placeholder="blur"
          alt="Presenting: When Does Development Spark Joy? Sentimental analysis of commit messages."
          quality={100}
          originalWidth={mePresenting.width}
          originalHeight={mePresenting.height}
          priority={true}
          style={{ borderRadius: '0.4em' }}
        />
        <p>
          I like teaching people things that I know. I like video games (especially classic FPS games like Quake and Counter-Strike), classic games (chess, scrabble, sudoku), running, and reading.
        </p>
        <p>
          I am easily impressed by people and the cool stuff they build. I
          read a lot of technical blogs. If we've ever interacted,
          I've visited your website and probably think it's cool!
        </p>
        <p>Technical books I recommend include <i>Crafting Interpreters</i>, and <i>The Computational Beauty of Nature</i>. For general fiction, I recommend the authors Patricia Lockwood and Ben Lerner. For sci-fi, I recommend the <i>Dune</i> series (1-6 are amazing, 7-9 are good), and the <i>Remembrance of Earth's Past</i> trilogy. For non-fiction, I recommend <i>The Orchid Thief</i>, and <i>Nothing To Envy</i>.</p>
        <p>I prefer rainy days, I like the colder months, and I drink a lot of coffee and diet soda.</p>
        <h2>Work</h2>
        <p>I'm a software engineer at Vercel. Before that, I worked as a software engineer at two other companies – and before that, I was an amateur game developer and a writer.</p>
        <h2>Education</h2>
        <ul>
          <li><Link href="/my-time-at-the-recurse-center">The Recurse Center (W2'23)</Link></li>
          <li>M.S.c. in Computer Science (Distinction)</li>
          <li>B.A. in Creative Writing (with First Class Honours)</li>
        </ul>
      </main>
    </Layout>
  );
}

import siteConfig from "../siteConfig.json";
import mePresenting from "../public/assets/presenting-high-res.jpg";

import SpacedImage from "../components/image";
import Layout from "../components/layout";
import Link from "next/link";

export default function About() {
  return (
    <Layout title="About" description="About me.">
      <h1>About</h1>
      <main>
        <p>
          I write software and write about software. I{" "}
          <a href="mailto:healeycodes@gmail.com">love getting email</a> —
          consider this a{" "}
          <a
            href="https://www.kalzumeus.com/standing-invitation/"
            target="_blank"
            rel="noreferrer"
          >
            standing invitation
          </a>
          . My research interests include personal computing, game solvers (chess, sokoban, and more), and programming language design. This <a href={siteConfig.REPO_URL}>open source</a> website is built with Next.js.
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
          I like teaching people things that I know. I like video games,
          running, and reading.
        </p>
        <p>
          I am easily impressed by people and the cool stuff that they build. I
          read a lot of technical blogs. If we've ever interacted,
          I've visited your website and probably think it's cool!
        </p>
        <p>Technical books I recommend include Crafting Interpreters, and The Computational Beauty of Nature. Non-tech authors I recommend include Patricia Lockwood and Ben Lerner. In my undergrad, I mostly studied post-WWII fiction.</p>
        <p>I prefer cold days, and drink coffee every day.</p>
        <h2>Work</h2>
        <p>I'm a software engineer at Vercel.</p>
        <h2>Education</h2>
        <ul>
          <li>The Recurse Center (W2'23)</li>
          <li>M.S.c. in Computer Science (Distinction)</li>
          <li>B.A. in Creative Writing (with First Class Honours)</li>
        </ul>
      </main>
    </Layout>
  );
}

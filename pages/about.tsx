import siteConfig from "../siteConfig.json";
import mePresenting from "../public/assets/presenting-high-res.jpg";

import SpacedImage from "../components/image";
import Layout from "../components/layout";

export default function About() {
  return (
    <Layout title="About" description="About me">
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
          . Lately, I've been interested in chess engines, programming language interpreters, and
          digital gardens. This website is built with Next.js and hosted on
          Vercel. It's <a href={siteConfig.REPO_URL}>open source</a>.
        </p>
        <SpacedImage
          src={mePresenting}
          placeholder="blur"
          alt="Presenting: When Does Development Spark Joy? Sentimental analysis of commit messages."
          quality={100}
          originalWidth={mePresenting.width}
          originalHeight={mePresenting.height}
          priority={true}
        />
        <p>
          I like teaching people things that I know. I like video games,
          running, and reading.
        </p>
        <p>
          I am easily impressed by people and the cool stuff that they build. I
          read a lot of personal and technical blogs. If we've ever interacted,
          I've visited your website and probably think it's cool!
        </p>
        <h2>Things I Like (continued)</h2>
        <p>Technical books I recommend include Grokking Algorithms, Crafting Interpreters, Classic Computing Problems in Python, and The Computational Beauty of Nature.</p>
        <p>Non-tech authors I recommend include Patricia Lockwood and Ben Lerner. In my undergrad, I mostly studied post-WWII fiction.</p>
        <p>I like being outside and prefer cold days. I enjoy the rain.</p>
        <h2>Work</h2>
        <p>I'm a software engineer at Vercel.</p>
        <h2>Education</h2>
        <ul>
          <li>M.S.c. in Computer Science (Distinction)</li>
          <li>B.A. in Creative Writing (with First Class Honours)</li>
        </ul>
      </main>
    </Layout>
  );
}

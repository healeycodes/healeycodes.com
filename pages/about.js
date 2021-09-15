import siteConfig from "../siteConfig.json";

import SpacedImage from "../components/image";
import Layout from "../components/layout";
import mePresenting from "../public/assets/presenting-high-res.jpg";

export default function About() {
  return (
    <Layout title="About" description="About me">
      <h1>About</h1>
      <p>
        I write software and write about software. I{" "}
        <a href="mailto:healeycodes@gmail.com">love getting email</a> — consider
        this a{" "}
        <a
          href="https://www.kalzumeus.com/standing-invitation/"
          target="_blank"
          rel="noreferrer"
        >
          standing invitation
        </a>
        . Lately, I've been interested in chess engines, interpreters, and
        digital gardens. This website is built with Next.js and hosted on
        Vercel. It's <a href={siteConfig.REPO_URL}>open source</a>.
      </p>
      <SpacedImage
        src={mePresenting}
        alt="Presenting: When Does Development Spark Joy? Sentimental analysis of commit messages."
        quality={100}
        layout="responsive"
      />
      <p>
        I like teaching people things that I know. I like video games, running,
        and reading.
      </p>
      <p>
        I am easily impressed by people and the cool stuff that they build. I
        read a lot of personal and technical blogs. If we've ever interacted,
        I've visited your website and probably think it's cool!
      </p>
      <h2>Work</h2>
      <p>
        I currently lead a team of three software engineers building very cool
        things for the web! Lately, I've been focusing on improving the
        observability of our systems and keeping things fast!
      </p>
      <h2>Education</h2>
      <ul>
        <li>M.S.c. in Computer Science (Distinction)</li>
        <li>B.A. in Creative Writing (with First Class Honours)</li>
      </ul>
    </Layout>
  );
}

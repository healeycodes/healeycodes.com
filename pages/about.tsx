import siteConfig from "../siteConfig.json";
// import mePresenting from "../public/assets/presenting-high-res.jpg";

// import SpacedImage from "../components/image";
import Layout from "../components/layout";
// import Link from "next/link";

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
        {/* <SpacedImage
          src={mePresenting}
          placeholder="blur"
          alt="Presenting: When Does Development Spark Joy? Sentimental analysis of commit messages."
          quality={100}
          originalWidth={mePresenting.width}
          originalHeight={mePresenting.height}
          priority={true}
          style={{ borderRadius: '0.4em' }}
        /> */}
        <p>
          I am currently working on api & Gateway & cloud-native architecture.
        </p>
        <h2>What I am going to do</h2>
        <p>
          I am a person who likes to think and have the habit of writing down
          what I think. Whether you can use tools or not is the key to
          distinguishing humans from animals, and whether you can believe or not
          is the key to determining a real human being. Therefore, this site
          aimed to record my deep thinking in some system architecture design,
          algorithms, or other things.
        </p>
        <h2>Work</h2>
        <p>
          Currently, I work for a cross-border e-commerce company(SHEIN) with
          both challenges and potential and build distributed cloud-native
          architecture for them. I enjoy my current job and look forward to
          becoming a respected person in the future.{" "}
        </p>
        <h2>Education</h2>
        <ul>
          <li>B.A. in Software Engineering</li>
        </ul>
      </main>
    </Layout>
  );
}

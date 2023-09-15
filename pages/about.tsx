import siteConfig from "../siteConfig.json";
import mePresenting from "../public/assets/presenting-api-and-cloud-native.png";
import meAvatar from "../public/assets/avatar.jpg";
import Image from "next/image";
import SpacedImage from "../components/image";
import Layout from "../components/layout";
import Link from "next/link";

export default function About() {
  return (
    <Layout title="About" description="About me.">
      <main>
        <div className="avatar">
          <Image
            width={140}
            height={140}
            src={meAvatar}
            alt="Chever John."
            quality={100}
            placeholder="blur"
            priority={true}
            style={{ borderRadius: "0.4em" }}
          />
          <p className="avatar-text">
            I am a software engineer, and I insist on calling myself that. I
            understand that a software engineer needs to master system design,
            algorithm solving ability, and engineering building ability, and I
            have been aiming at these three directions.
          </p>
        </div>
        <p>
          Never hesitate to send me an{" "}
          <a href="mailto:cheverjonathan@gmail.com">email</a> — if you want to
          talk with me. I love getting email from you. Priority for technical
          issues.
        </p>
        <p>
          My research interests include personal computing,homelab and
          programming language design. This{" "}
          <a href={siteConfig.REPO_URL}>open source</a> website is built with
          Next.js.
        </p>
        <h2>What I have done</h2>
        <p>1. Contribute to some open source project.</p>
        <p>2. Presenting at some conference.</p>
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
        <h2>What I am doing right now</h2>
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

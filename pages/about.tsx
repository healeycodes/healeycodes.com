import siteConfig from "../siteConfig.json";
import mePresenting from "../public/assets/presenting-api-and-cloud-native.png";
import meAvatar from "../public/assets/avatar.jpg";

import SpacedImage from "../components/image";
import Layout from "../components/layout";
// import Link from "next/link";

import Image from "next/image";

export default function About() {
  return (
    <Layout title="About" description="About me.">
      <h1>About</h1>
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
            Hi, I am Chenwei Jiang(Chever John). I am a software engineer and
            currently work for SHEIN with both challenges and potential and
            build distributed cloud-native architecture for them.
          </p>
        </div>
        <div className="about-section">
          {/* <p>
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
            .
          </p> */}
          <p>
            I am a person who likes to think and have the habit of writing down
            what I think. Whether you can use tools or not is the key to
            distinguishing humans from animals, and whether you can believe or
            not is the key to determining a real human being. Therefore, this
            site aimed to record my deep thinking in some system architecture
            design, algorithms, or other things.
          </p>

          <h2>Past</h2>
          <p>
            If you want to see all the cool computer stuff I've done in the
            past, just head over to my {" "}
            <a
              href="https://github.com/Chever-John"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>{" "}
            profile.
          </p>
          <p>
            I've got all my projects listed there, even the embarrassing ones
            from my early days. Hey, practice makes perfect!
          </p>
          <p>
            Oh, I'm still sorting out my SourceHut account, but it's gonna be
            epic! I'm gonna show off all my coding skills and dazzle everyone
            with my digital wizardry. Just you wait and see!
          </p>

          <h2>Present</h2>
          <p>
            I am currently working on api & Gateway & cloud-native architecture.
          </p>
          <p>Yes, I also gave a presentation on this topic.</p>
          <p>
            Speaking at ApacheConAsia was a life-changing experience. I faced my
            fears and gave a meaningful presentation in front of a supportive
            audience.
          </p>
          <SpacedImage
            src={mePresenting}
            placeholder="blur"
            alt="Presenting: When Does Development Spark Joy? Sentimental analysis of commit messages."
            quality={100}
            originalWidth={mePresenting.width}
            originalHeight={mePresenting.height}
            priority={true}
            style={{ borderRadius: "0.4em" }}
          />

          <h2>Future</h2>
          <p>
            I am a person who likes to think and have the habit of writing down
            what I think. Whether you can use tools or not is the key to
            distinguishing humans from animals, and whether you can believe or
            not is the key to determining a real human being. Therefore, this
            site aimed to record my deep thinking in some system architecture
            design, algorithms, or other things.
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
        </div>
      </main>

      <style jsx>{`
        .avatar {
          display: flex;
          align-items: center;
          padding-top: 6px;
          padding-bottom: 6px;
        }
        .avatar-text {
          margin-left: 28px;
          max-width: 480px;
        }
        .posts {
          display: flex;
        }
        .posts-section {
          flex: 1;
          padding-right: 20px;
        }

        @media only screen and (max-width: ${siteConfig.LAYOUT_WIDTH}px) {
          .avatar {
            display: block;
            padding-top: 38px;
          }
          .avatar-text {
            margin-left: initial;
            margin-bottom: 0px;
          }
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

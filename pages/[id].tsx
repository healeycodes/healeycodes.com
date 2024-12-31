import fs from "fs";
import path from "path";
import imageSize from "image-size";
import mp4box from 'mp4box';

import React from "react";
import Link from "next/link";

import Markdown from "markdown-to-jsx";
import { getAllPostIds, getPostData, getNextAndPrevPosts } from "../lib/posts";

import Layout from "../components/layout";
import SpacedImage from "../components/image";
import Code from "../components/code";
import Date from "../components/date";
import Newsletter from "../components/newsletter";
import { AldousBroder, IntroMaze, RandomDFS, TreeDiameter, WilsonsAlgorithm } from "../components/visuals/mazes/components";

const isVideo = /\.mp4$/;

export async function getStaticPaths() {
  const paths = getAllPostIds();
  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const postData = await getPostData(params.id);

  const postImages = path.join(process.cwd(), "public", "posts", params.id);
  const imageMetadata = {};
  const videoMetadata = {};

  const getVideoDimensions = async (filePath): Promise<{ width: number, height: number }> => {
    return new Promise((resolve, reject) => {
      const mp4boxFile = mp4box.createFile();
      fs.readFile(filePath, (err, data) => {
        if (err) { throw err };
        const buf = new Uint8Array(data).buffer
        // @ts-ignore
        buf.fileStart = 0

        mp4boxFile.onError = reject;
        mp4boxFile.onReady = (info) => {
          const videoTracks = info.tracks.filter(track => track.name === 'VideoHandler');
          resolve({ width: Math.max(...videoTracks.map(t => t.video.width)), height: Math.max(...videoTracks.map(t => t.video.height)) });
        };
        mp4boxFile.appendBuffer(buf);
        mp4boxFile.flush();
      });
    });
  };

  if (fs.existsSync(postImages)) {
    const files = fs.readdirSync(postImages);
    files
      .filter(fp => !fp.match(isVideo))
      .forEach((image) => {
        imageMetadata[image] = { ...imageSize(path.join(postImages, image)) };
      });

    for (const fp of files.filter(fp => fp.match(isVideo))) {
      videoMetadata[fp] = { ...(await getVideoDimensions(path.join(postImages, fp))) }
    }
  }

  let prevPost = null;
  let nextPost = null;
  const nextAndPrevPosts = getNextAndPrevPosts(params.id);
  if (nextAndPrevPosts.previous !== null) {
    prevPost = {
      id: nextAndPrevPosts.previous,
      ...getPostData(nextAndPrevPosts.previous),
    };
  }
  if (nextAndPrevPosts.next !== null) {
    nextPost = {
      id: nextAndPrevPosts.next,
      ...getPostData(nextAndPrevPosts.next),
    };
  }

  return {
    props: {
      id: params.id,
      source: postData.content,
      imageMetadata,
      videoMetadata,
      ...postData,
      prevPost,
      nextPost,
    },
  };
}

export default function Post({
  id,
  title,
  description,
  tags,
  date,
  outdated,
  imageMetadata,
  videoMetadata,
  source,
  prevPost,
  nextPost,
}) {
  const seo = { title, description };

  return (
    <Layout {...seo}>
      <header>
        <h1 className="post-title">{title}</h1>
        <p className="post-date">
          <Date dateString={date} />
        </p>
      </header>
      <main className="post-text">
        {outdated === true ? <aside>
          <small><b>This is outdated!</b> I don't stand by this post anymore — my beliefs have changed, or I've stopped doing it this way, or I realized it's just flat out wrong. I like keeping old writing online to look back on so that's why it's still here, in its glorious wrongness.</small>
        </aside> : null}
        <Markdown
          options={{
            createElement(type, props, children) {
              if (type === "img") {
                if (props.src.match(isVideo)) {
                  return <video style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
                    key={props.src}
                    controls={false}
                    autoPlay
                    playsInline
                    loop
                    muted
                    width={videoMetadata[props.src].width}
                    height={videoMetadata[props.src].height}>
                    <source src={`/posts/${id}/${props.src}`} type="video/mp4"></source>
                  </video>
                }
                return (
                  <SpacedImage
                    {...props} // @ts-ignore
                    src={`/posts/${id}/${props.src}`} // @ts-ignore
                    originalHeight={imageMetadata[props.src].height} // @ts-ignore
                    originalWidth={imageMetadata[props.src].width}
                    quality={100}
                    priority={true}
                  />
                ); // @ts-ignore
              } else if (type === "code" && props.className) { // @ts-ignore 
                const language = props.className.replace("lang-", "");
                return <Code children={children} language={language} />;
              } else if (type === "div" && props.className === "mazes") {
                if (props.id === 'randomDFS') {
                  return RandomDFS()
                } else if (props.id === 'introMaze') {
                  return IntroMaze()
                } else if (props.id === 'aldousBroder') {
                  return AldousBroder()
                } else if (props.id === 'wilsonsAlgorithm') {
                  return WilsonsAlgorithm()
                } else if (props.id === 'treeDiameter') {
                  return TreeDiameter()
                }
              }
              return React.createElement(type, props, children);
            },
          }}
        >
          {source}
        </Markdown>
      </main>
      <hr />
      <Newsletter />
      <div className="other-posts">
        {prevPost ? (
          <div className="other-posts-link">
            <Link href={`/${prevPost.id}`} legacyBehavior>{`← ${prevPost.title}`}</Link>
          </div>
        ) : null}
        {nextPost ? (
          <div className="other-posts-link">
            <Link href={`/${nextPost.id}`} legacyBehavior>{`${nextPost.title} →`}</Link>{" "}
          </div>
        ) : null}
      </div>
      <style jsx>{`
        header {
          padding-top: 16px;
          padding-bottom: 16px;
        }
        .post-title {
          margin-bottom: 0px;
          padding-bottom: 0px;
        }
        .post-text {
          padding-top: 16px;
        }
        .post-date {
          margin-top: 0px;
          padding-top: 8px;
          color: var(--light-text);
        }
        .other-posts {
          padding-top: 48px;
        }
        .other-posts-link {
          display: block;
          padding-bottom: 32px;
        }
        aside {
          background-color: var(--aside);
          padding: 1.5em 1.5em;
          margin-bottom: 2.5em;
        }
      `}</style>
    </Layout>
  );
}

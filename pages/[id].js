import siteConfig from "../siteConfig.json";

import fs from "fs";
import path from "path";
import imageSize from "image-size";

import React from "react";
import Link from "next/link";
import Image from "next/image";

import Highlight, { defaultProps } from "prism-react-renderer";
import prismTheme from "prism-react-renderer/themes/github";
import Markdown from "markdown-to-jsx";
import { getAllPostIds, getPostData, getNextAndPrevPosts } from "../lib/posts";
import Layout from "../components/layout";
import Date from "../components/date";

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

  if (fs.existsSync(postImages)) {
    const imageFiles = fs.readdirSync(postImages);
    imageFiles.forEach((image) => {
      imageMetadata[image] = imageSize(path.join(postImages, image));
    });
  }

  let prevPost = null;
  let nextPost = null;
  const nextAndPrevPosts = getNextAndPrevPosts(params.id);
  if (nextAndPrevPosts.previous !== null) {
    prevPost = {
      id: nextAndPrevPosts.previous,
      ...getPostData(nextAndPrevPosts.previous).data,
    };
  }
  if (nextAndPrevPosts.next !== null) {
    nextPost = {
      id: nextAndPrevPosts.next,
      ...getPostData(nextAndPrevPosts.next).data,
    };
  }

  return {
    props: {
      id: params.id,
      source: postData.content,
      imageMetadata,
      ...postData.data,
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
  imageMetadata,
  source,
  prevPost,
  nextPost,
}) {
  const seo = { title, description };

  return (
    <Layout {...seo}>
      <h1>{title}</h1>
      <h3>
        <Date dateString={date} /> in{" "}
        {tags
          .map((tag, i) => (
            <Link href={`/tags/${tag}`} key={i}>
              {`${tag.charAt(0).toUpperCase()}${tag.slice(1)}`}
            </Link>
          ))
          .reduce((prev, curr) => [prev, ", ", curr])}{" "}
        — <a href={`${siteConfig.EDIT_POST_URL}/${id}.md`}>Edit on GitHub</a>
      </h3>
      <Markdown
        children={source}
        options={{
          // Here we can extend our plain Markdown posts with React components
          createElement(type, props, children) {
            if (type === "img") {
              return (
                <Image
                  {...props}
                  src={`/posts/${id}/${props.src}`}
                  height={imageMetadata[props.src].height}
                  width={imageMetadata[props.src].width}
                  quality={100}
                />
              );
            } else if (
              type === "code" &&
              props.className &&
              props.className.includes("lang-")
            ) {
              return (
                <Highlight
                  {...defaultProps}
                  theme={prismTheme}
                  code={children}
                  language={props.className.replace("lang-", "")}
                >
                  {({
                    className,
                    style,
                    tokens,
                    getLineProps,
                    getTokenProps,
                  }) => (
                    <pre className={className} style={style}>
                      {tokens.map((line, i) => (
                        <div {...getLineProps({ line, key: i })}>
                          {line.map((token, key) => (
                            <span {...getTokenProps({ token, key })} />
                          ))}
                        </div>
                      ))}
                    </pre>
                  )}
                </Highlight>
              );
            }
            return React.createElement(type, props, children);
          },
        }}
      />
      <div>
        Have a comment? I'd love to hear it, please{" "}
        <a href="mailto:healeycodes@gmail.com">email me</a>. Find an issue with
        this post? Please{" "}
        <a href={`${siteConfig.EDIT_POST_URL}/${id}.md`}>edit it on GitHub</a>.
      </div>
      <div>
        {prevPost ? (
          <Link href={`/${prevPost.id}`}>{`← ${prevPost.title}`}</Link>
        ) : null}
        {nextPost ? (
          <Link href={`/${nextPost.id}`}>{`${nextPost.title} →`}</Link>
        ) : null}
      </div>
    </Layout>
  );
}

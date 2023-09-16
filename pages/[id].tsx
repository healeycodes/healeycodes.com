import fs from "fs";
import path from "path";
import imageSize from "image-size";

import React from "react";
import Link from "next/link";

import Markdown from "markdown-to-jsx";
import { getAllPostIds, getPostData, getNextAndPrevPosts } from "../lib/posts";

import Layout from "../components/layout";
import SpacedImage from "../components/image";
import Code from "../components/code";
import Date from "../components/date";
import Newsletter from "../components/newsletter";

// getStaticPaths 是一个异步函数，它用于定义动态路由的路径参数。
// 在 Next.js 中，动态路由是指根据数据源动态生成页面的路由。
export async function getStaticPaths() {
  // 在这个函数中，我们调用了 getAllPostIds 函数。
  // 将返回一个包含了所有动态路由路径参数的数组。
  // 返回目录下的所有文件名，不包括文件夹名，这边是返回了所有博客的文件名，组成一个列表数组。
  const paths = getAllPostIds();

  // 在最后，返回了一个对象，它包含了 paths 数组和 fallback 属性。
  return {
    paths,
    fallback: false,
  };
}

// getStaticProps 是一个异步函数，它用于获取动态路由的数据。
// Props 是组件的属性（Properties）的简写，它是组件的输入，用于传递数据。
// getStaticProps 函数在构建时运行，而不是在浏览器中运行。它可以执行异步操作，
// 例如从 API 或文件系统中获取数据。获取到的数据可以被页面组件使用，以进行动态内容的渲染。
export async function getStaticProps({ params }) {
  const postData = await getPostData(params.id);

  const postImages = path.join(process.cwd(), "public", "posts", params.id);
  const imageMetadata = {};

  if (fs.existsSync(postImages)) {
    const imageFiles = fs.readdirSync(postImages);
    imageFiles.forEach((image) => {
      imageMetadata[image] = { ...imageSize(path.join(postImages, image)) };
    });
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
        {outdated === true ? (
          <aside>
            <small>
              <b>This is outdated!</b> I don't stand by this post anymore — my
              beliefs have changed, or I've stopped doing it this way, or I
              realized it's just flat out wrong. I like keeping old writing
              online to look back on so that's why it's still here, in its
              glorious wrongness.
            </small>
          </aside>
        ) : null}
        <Markdown
          options={{
            // createElement 函数，接受 type、props 和 children 三个参数。
            // 并根据 type 的不同返回不同的 React 元素。
            createElement(type, props, children) {
              // 如果 type 是 img，那么就返回一个 SpacedImage 组件。
              if (type === "img") {
                return (
                  // props 对象中的所有属性会通过展开运算符 ...props 传递给 SpacedImage 组件。
                  // src 属性会被设置为 /posts/${id}/${props.src}，其中 id 是动态路由的路径参数。
                  // originalHeight 和 originalWidth 属性会被设置为 imageMetadata[props.src].height 和 imageMetadata[props.src].width。
                  // 表示图片的原始高度和原始宽度。
                  // quality 属性会被设置为 100，表示图片的质量。
                  // priority 属性会被设置为 true，表示图片的加载优先级。
                  <SpacedImage
                    {...props} // @ts-ignore
                    src={`/posts/${id}/${props.src}`} // @ts-ignore
                    originalHeight={imageMetadata[props.src].height} // @ts-ignore
                    originalWidth={imageMetadata[props.src].width}
                    quality={100}
                    priority={true}
                  />
                ); 
                // 如果 type 是 code，那么就返回一个 Code 组件。
                // 并且 props.className 存在，函数会继续执行。
                // @ts-ignore
              } else if (type === "code" && props.className) {
                // @ts-ignore
                const language = props.className.replace("lang-", "");
                return <Code children={children} language={language} />;
              }
              return React.createElement(type, props, children);
            },
          }}
        >
          {source}
        </Markdown>
      </main>
      <hr />
      {/* Newsletter 是最下面的订阅邮箱 */}
      <Newsletter />
      {/* 这段代码是一个 React 组件的 JSX 部分，它渲染了两个链接，用于显示前一篇和后一篇博客文章的标题，
      并将用户导航到对应的文章页面。 */}
      <div className="other-posts">
        {/* 使用条件语句判断 prevPost 变量是否存在。如果 prevPost 存在，表示前一篇文章存在。
        我们将其渲染一个 <div> 元素，并将它设置属性为 other-posts-link */}
        {prevPost ? (
          <div className="other-posts-link">
            <Link
              // href 属性被设置为 /${prevPost.id}，其中 id 是动态路由的路径参数。
              // 这里使用了模版字符串来动态设置链接的路径为 /${prevPost.id}。
              href={`/${prevPost.id}`}
              //  legacyBehavior 属性用于指定链接的行为，这里设置为 true，表示使用旧版的路由行为。
              legacyBehavior
            >{`← ${prevPost.title}`}</Link>
          </div>
        ) : // 三元运算符，如果 prevPost 存在，就渲染一个 <div> 元素，否则渲染 null。
        null}
        {nextPost ? (
          <div className="other-posts-link">
            <Link
              href={`/${nextPost.id}`}
              legacyBehavior
            >{`${nextPost.title} →`}</Link>{" "}
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

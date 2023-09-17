// 从指导路径导入了两个模块
// siteConfig 记录了网站的基本信息，比如网站使用的语言之类的。
import siteConfig from "../siteConfig.json";

// Document 是 Next.js 提供的基础文档组件，用于自定义 HTML 文档的渲染。
import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  // 在 MyDocument 类组件中的 render 方法中，返回了一个 React 片段（Fragment）。
  // 返回一个 JSX 元素，它描述了要渲染的 HTML 结构。
  render() {
    // 1. 使用 siteConfig.SITE_LANG 获取了网站的语言。
    // 2. Head 组件，包含了文档的头部信息，例如 <link> 和 <meta> 标签。
    // 3. <link href="https://fonts.googleapis.com 吧啦吧啦，引入 Google Fonts 字体样式表。"
    // 4. <body> 标签，包含了文档的主体内容。
    // 5. Main 组件，包含了应用程序的根组件，它是从 pages/_app.tsx 中传入的。也就是渲染当前页面（对了，_app.tsx
    // 我所介绍过，传入当前页面，并对当前页面做效果，所以这里的 main 可以用来渲染当前页面）。
    // 6. NextScript 组件，包含了 Next.js 自动注入的脚本，包括页面切换时的应用程序状态。
    return (
      <Html lang={siteConfig.SITE_LANG}>
        <Head>
          <link
            href="https://fonts.googleapis.com/css2?family=Inter&display=swap"
            rel="stylesheet"
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap"
            rel="stylesheet"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

// 最后使用 ES6 的 export default 语法导出了 MyDocument 类组件。以便在其他文件中可以引入和使用它。
export default MyDocument;

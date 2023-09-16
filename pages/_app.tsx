// 首先从指定路径导入了两个模块
// GCScript 是一个自定义组件，可能负责在页面中插入一些脚本或代码
import { GCScript } from "../components/gcScript";
// Analytics 是来自 @vercel/analytics 的一个组件，可能负责收集和发送应用程序的分析数据。
import { Analytics } from "@vercel/analytics/react";

// 定义了一个 MyApp 函数组件，它接收两个对象参数：Component 和 pageProps。
// 这个函数组件是 Next.js 中自定义应用程序的入口点，用于包装所有页面组件。
function MyApp({ Component, pageProps }) {
  // 函数内部返回了一个 React 片段（Fragment），它包含了以下内容：
  // 1. Analytics 组件，用于收集和发送应用程序的分析数据。
  // 2. GCScript 组件，插入 GoatCounter 计数器脚本，这个是 https://www.goatcounter.com/ 的一个开源计数器。用于网站内容分析的。
  // 3. Component 组件，这个是 Next.js 中的页面组件，它是从 MyApp 函数组件的参数中传入的。
  // 是一个动态渲染的页面组件，它接受 pageProps 对象中的所有属性作为参数，这个组件可能是当前页面对应的
  // 实际页面组件。
  return (
    <>
      <Analytics />
      <GCScript siteUrl={"https://cheverjohn.goatcounter.com/count"} />
      <Component {...pageProps} />
    </>
  );
}

// 最后使用 ES6 的 export default 语法导出了 MyApp 函数组件。以便在其他文件中可以引入和使用它。
export default MyApp;
// 总体而言，这段代码的作用是定义了一个 Next.js 自定义应用程序组件 MyApp，它负责包装所有页面组件。
// 并在页面中插入了 GoatCounter 计数器脚本和 Analytics 组件，用于收集和发送应用程序的分析数据。

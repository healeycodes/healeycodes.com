import fs from "fs";
import path from "path";
import matter from "gray-matter";

// 定义了一个常量，它包含了博客文章所在的目录路径。
// process.cwd() 返回 Node.js 进程的当前工作目录。
// path.join(process.cwd(), 'posts') 使用了 Node.js 内置的 path 模块来拼接当前工作目录
// 与 posts 目录的路径，以得到完整的博客文章的目录路径。
const POSTS_DIRECTORY = path.join(process.cwd(), "posts");

// getAllPostIds 函数返回一个数组，其中包含了所有的文章 id。
export function getAllPostIds() {
  // 使用 fs.readdirSync(POSTS_DIRECTORY) 同步地读取 POSTS_DIRECTORY 目录下的所有文件名。
  // fs.readdirSync() 是 Node.js 文件系统模块 fs 内置的 api，它返回指定目录下的文件名列表。
  const fileNames = fs.readdirSync(POSTS_DIRECTORY);

  // 使用 map() 方法遍历 fileNames 数组中的每个文件名，并将其转换为一个对象。
  // 没个对象都具有一个 params 属性，该属性包含了 id 属性，它的值是文件名（没有 .md 后缀）。
  return fileNames.map((fileName) => {
    // 最后使用 return 关键字返回包含所有博客文章标识符的数组。每个标识符对象都具有 params 属性，
    return {
      params: {
        id: fileName.replace(".md", ""),
      },
    };
  });

  // 总结：读取目标目录中的所有博客文章文件名，然后将每个文件名转换为一个包含 params 属性的对象。
  // 以表示对应博客文章的标识符。
}

// getSortedPostsData 用于获取博客文章的数据并按日期排序。
export function getSortedPostsData() {
  // Get directory names under /posts
  const fileNames = fs.readdirSync(POSTS_DIRECTORY);

  const allPostsData = fileNames.map((fileName) => {
    // Read markdown file as string
    // 读取文件的内容，并将其作为字符串存储在 fileContents 变量中。
   // if fileName is .DS_Store, skip it
    if (fileName === ".DS_Store") {
      // print a warning to the console
      return;
    }

    const fullPath = path.join(POSTS_DIRECTORY, path.join(fileName));
    const fileContents = fs.readFileSync(fullPath, "utf8");

    // 使用 gray-matter 库解析文件内容，以提取元数据。
    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents);

    // Combine the data with the id
    return {
      // 将文件名（没有 .md 后缀）作为 id
      id: fileName.replace(".md", ""),
      // Could also grab content, not yet required
      // content: matterResult.content,
      title: matterResult.data.title,
      description: matterResult.data.description,
      date: matterResult.data.date,
      tags: matterResult.data.tags,
    };
  });

  // Sort posts by date
  // ts 的语法，将返回的变量加上 .sort() 方法，然后传入一个函数作为参数。至今觉得很难接受。
  return allPostsData.sort(({ date: a }, { date: b }) => {
    if (a < b) {
      return 1;
    } else if (a > b) {
      return -1;
    } else {
      return 0;
    }
  });
}

export function getPostData(id: string) {
  const fullPath = path.join(POSTS_DIRECTORY, `${id}.md`);
  const fileContents = fs.readFileSync(fullPath, "utf8");
  // matter 函数用于解析 Markdown 文件的函数。作用是将 Markdown 文件的内容解析成
  // 一个 JavaScript 对象，该对象包含了文件的元数据和内容。
  const matterResult = matter(fileContents);

  return {
    id,
    content: matterResult.content,
    title: matterResult.data.title,
    description: matterResult.data.description,
    date: matterResult.data.date,
    tags: matterResult.data.tags,
    // 这些元数据信息，基本上都是在 markdown 最开始的地方，用 --- 包裹的内容。
    outdated: matterResult.data.outdated || false,
  };
}

// 根据给定的文章 ID 获取前一篇和下一篇文章的 ID
// id: 当前文章的 ID
export function getNextAndPrevPosts(id: string) {
  const allPosts = getSortedPostsData()
    .map((post) => post.id)
    .reverse();

  if (allPosts.length === 0) {
    return { previous: null, next: null };
  } else if (allPosts.length === 1) {
    return { previous: allPosts[0], next: null };
  }

  for (let i = 0; i < allPosts.length; i++) {
    if (allPosts[i] === id) {
      if (i === 0) {
        return { previous: null, next: allPosts[i + 1] };
      } else if (i + 1 < allPosts.length) {
        return { previous: allPosts[i - 1], next: allPosts[i + 1] };
      }
      return { previous: allPosts[i - 1], next: null };
    }
  }
}

export function getPostsFilteredByTag(tag: string) {
  return getSortedPostsData().filter((post) => post.tags.includes(tag));
}

export function getAllTags() {
  const tags = new Set();
  getSortedPostsData().forEach((post) => {
    post.tags.forEach(tags.add, tags);
  });
  return Array.from(tags);
}

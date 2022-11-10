import fs from "fs";
import path from "path";
import matter from "gray-matter";

const POSTS_DIRECTORY = path.join(process.cwd(), "posts");

export function getAllPostIds() {
  const fileNames = fs.readdirSync(POSTS_DIRECTORY);

  return fileNames.map((fileName) => {
    return {
      params: {
        id: fileName.replace(".md", ""),
      },
    };
  });
}

export function getSortedPostsData() {
  // Get directory names under /posts
  const fileNames = fs.readdirSync(POSTS_DIRECTORY);

  const allPostsData = fileNames.map((fileName) => {
    // Read markdown file as string
    const fullPath = path.join(POSTS_DIRECTORY, path.join(fileName));
    const fileContents = fs.readFileSync(fullPath, "utf8");

    // Use gray-matter to parse the post metadata section
    const matterResult = matter(fileContents);

    // Combine the data with the id
    return {
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
  const matterResult = matter(fileContents);

  return {
    id,
    content: matterResult.content,
    title: matterResult.data.title,
    description: matterResult.data.description,
    date: matterResult.data.date,
    tags: matterResult.data.tags,
    outdated: matterResult.data.outdated || false,
  };
}

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

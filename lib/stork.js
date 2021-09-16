import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "posts");

function generateStorkConfig() {
  let config = `
[input]
base_directory = "posts"
url_prefix = "https://healeycodes.com/"
frontmatter_handling = "Omit"
files = [`;
  const fileNames = fs.readdirSync(postsDirectory);
  fileNames.forEach((fileName) => {
    const fullPath = path.join(postsDirectory, path.join(fileName));
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(fileContents);
    config += `{
        path = "${fileName}",
        url = "${fileName.replace(".md", "")}",
        title = "${data.title}"
},`;
  });
  config += `]
`;
  fs.writeFileSync(path.join(process.cwd(), "stork-posts.toml"), config);
}

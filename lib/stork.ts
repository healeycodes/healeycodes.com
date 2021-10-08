// TODO:
// Vercel uses Amazon Linux 2 which doesn't seem compatible with Stork's Ubuntu build
/*
14:09:38.517  	./stork-ubuntu-16-04-v1.2.1: error while loading shared libraries: libssl.so.1.0.0: cannot open shared object file: No such file or directory
14:09:38.527  	Error: Command "npm run build && chmod +x stork.sh && ./stork.sh" exited with 127
*/

import fs from "fs";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "posts");

export function generateStorkConfig() {
  let config = `
[input]
base_directory = "posts"
url_prefix = "https://healeycodes.com/"
frontmatter_handling = "Omit"
files = [\n`;
  const fileNames = fs.readdirSync(postsDirectory);
  fileNames.forEach((fileName) => {
    const fullPath = path.join(postsDirectory, path.join(fileName));
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(fileContents);
    config +=
      `  { path = "${fileName}",` +
      ` url = "${fileName.replace(".md", "")}",` +
      ` title = "${data.title}" },\n`;
  });
  config += `\n]
`;
  fs.writeFileSync(path.join(process.cwd(), "stork-posts.toml"), config);
}

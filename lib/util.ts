export function formatTag(tag: string) {
  return tag === "javascript"
    ? "JavaScript"
    : `${tag.charAt(0).toUpperCase()}${tag.slice(1)}`;
}

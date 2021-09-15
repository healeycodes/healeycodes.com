import siteConfig from "../siteConfig.json";

export default function imageResize(imageWidth, imageHeight) {
  let width, height;
  if (imageWidth > siteConfig.LAYOUT_WIDTH) {
    width = siteConfig.LAYOUT_WIDTH;
    height = imageHeight * (siteConfig.LAYOUT_WIDTH / imageWidth);
  } else {
    width = imageWidth;
    height = imageHeight;
  }
  return { width, height };
}

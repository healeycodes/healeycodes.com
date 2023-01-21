import siteConfig from "../siteConfig.json";

import Image from "next/legacy/image";

function imageResize(imageWidth, imageHeight) {
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

export default function SpacedImage(props) {
  const { originalWidth, originalHeight, ...rest } = props;
  let { width, height } = imageResize(originalWidth, originalHeight);

  return (
    <div className="spacer">
      <Image {...rest} width={width} height={height} />
      <style jsx>{`
        .spacer {
          padding-top: 16px;
          padding-bottom: 16px;
        }
      `}</style>
    </div>
  );
}

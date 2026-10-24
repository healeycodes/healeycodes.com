import siteConfig from "../siteConfig.json";

import Image from "next/image";

function imageResize(imageWidth, imageHeight, requestedWidth) {
  const naturalWidth = Math.min(imageWidth, siteConfig.LAYOUT_WIDTH);
  const width = requestedWidth
    ? Math.min(requestedWidth, naturalWidth)
    : naturalWidth;
  const height = imageHeight * (width / imageWidth);
  return { width, height };
}

export default function SpacedImage(props) {
  const { originalWidth, originalHeight, width: requestedWidth, height: _requestedHeight, ...rest } = props;
  const pixelWidth = Number(requestedWidth);
  const { width, height } = imageResize(
    originalWidth,
    originalHeight,
    Number.isFinite(pixelWidth) && pixelWidth > 0 ? pixelWidth : undefined,
  );

  return (
    <span className="spacer">
      <Image style={{
        display: 'block',
        marginInline: 'auto',
        maxWidth: '100%',
        height: 'auto',
      }} {...rest} width={width} height={height} />
      <style jsx>{`
        .spacer {
          padding-top: 16px;
          padding-bottom: 16px;
        }
      `}</style>
    </span>
  );
}

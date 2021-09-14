import Image from "next/image";

export default function SpacedImage(props) {
  return (
    <div className="spacer">
      <Image {...props} />
      <style jsx>{`
        .spacer {
          padding-top: 16px;
          padding-bottom: 16px;
        }
      `}</style>
    </div>
  );
}

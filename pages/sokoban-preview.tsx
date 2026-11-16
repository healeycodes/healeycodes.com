// Dev-only preview of the Sokoban post diagrams: /sokoban-preview?id=headline
// (no id = all of them). Returns 404 in production builds.
import { useRouter } from "next/router";
import Layout from "../components/layout";
import { SOKOBAN_VISUALS, SokobanVisual } from "../components/visuals/sokoban/components";

export async function getStaticProps() {
  if (process.env.NODE_ENV === "production") return { notFound: true };
  return { props: {} };
}

export default function SokobanPreview() {
  const { query } = useRouter();
  const ids = typeof query.id === "string" ? query.id.split(",") : Object.keys(SOKOBAN_VISUALS);
  return (
    <Layout title="Sokoban diagram preview" description="preview">
      <main>
        {ids.map((id) => (
          <div key={id} data-sk-id={id}>
            <code>{id}</code>
            {SOKOBAN_VISUALS[id] ? <SokobanVisual id={id} /> : <p>unknown id</p>}
          </div>
        ))}
      </main>
    </Layout>
  );
}

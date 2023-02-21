import Link from "next/link";
import Layout from "../components/layout";

export default function About() {
  return (
    <Layout title="Uses" description="My gear and tools.">
      <h1>Uses</h1>
      <p>I need to rewrite this page! I'm jealous of <a href="https://www.cindy-wu.com/uses"> Cindy Wu's /uses page</a>.</p>
      <main>
        <ul>
          <li>Work</li>
          <ul>
            <li>Apple M1 Pro</li>
            <li>Terminal</li>
            <li>VS Code (for code)</li>
            <li>Notion (for writing)</li>
          </ul>
          <li>Coffee</li>
          <ul>
            <li>DeLonghi Traditional Pump Espresso Machine</li>
            <li>Aeropress</li>
          </ul>
        </ul>
        <p>I try to build my own little tools and scripts. See <Link href="/articles">my posts</Link> for more on that!</p>
      </main>
    </Layout>
  );
}

import Layout from "../components/layout";

export default function About() {
  return (
    <Layout title="Uses" description="My gear and tools.">
      <h1>Uses</h1>
      <main>
        <h3>Gear</h3>
        <ul>
          <li>MacBook Pro (2018)</li>
          <li>
            (2x) 22" 1080p screens (240hz){" "}
            <i>(looking to upgrade to a single 5K screen)</i>
          </li>
          <li>UK Filco Majestouch-2, Tenkeyless, MX Brown Tactile, Keyboard</li>
          <li>SteelSeries Rival 110 mouse</li>
          <li>Arctis 1 Wireless</li>
        </ul>
        <h3>Tools</h3>
        <ul>
          <li>VS Code (dark GitHub theme)</li>
          <li>iTerm2 w/ Zsh</li>
          <li>GitHub Desktop for side projects, git CLI for work</li>
        </ul>
      </main>
    </Layout>
  );
}

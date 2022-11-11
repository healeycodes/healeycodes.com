import Layout from "../components/layout";

export default function About() {
  return (
    <Layout title="Uses" description="My gear and tools.">
      <h1>Uses</h1>
      <p>Recently, I reset/removed all of my developer tools and I'm running with the basics.</p>
      <main>
        <ul>
          <li>Work</li>
          <ul>
            <li>MacBook Pro (M1)</li>
            <li>Terminal (+ zsh, ripgrep, git, nano)</li>
            <li>VS Code (+ GitLens)</li>
            <li>Slack</li>
          </ul>
          <li>Personal</li>
          <ul>
            <li>Gaming PC</li>
            <li>UK Filco Majestouch-2, Tenkeyless, MX Brown Tactile, Keyboard</li>
            <li>SteelSeries Rival 110 mouse</li>
            <li>Arctis 1 Wireless</li>
          </ul>
        </ul>
      </main>
    </Layout>
  );
}

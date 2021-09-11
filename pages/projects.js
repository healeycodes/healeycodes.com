import games from "../data/games";
import projects from "../data/projects";

import Link from "next/link";
import Layout from "../components/layout";

export default function Projects() {
  return (
    <Layout
      title="Projects"
      description="Some of the software I've released. Some of the projects are fun
    experiments and others are used by people everyday!"
    >
      <h1>Open Source</h1>

      <p>
        Here's some of the software I've released. Some of the projects are fun
        experiments and others are used by people everyday! I'm accepting pull
        requests and issues on all of them — and I'm happy to onboard you.
      </p>
      <h2>Projects</h2>
      <dl>
        {projects.map((project, i) => {
          return (
            <>
              <dt>
                <a href={project.link}>{project.name}</a>
              </dt>
              <dd>
                {project.desc}{" "}
                {project.to ? (
                  <>
                    Read my <a href={project.to}>write-up</a>.
                  </>
                ) : null}
              </dd>
            </>
          );
        })}
      </dl>
      <h2>Games</h2>
      <dl>
        {games.map((game, i) => {
          return (
            <>
              <dt>
                <a href={game.link}>{game.name}</a>
              </dt>
              <dd>{game.desc}</dd>
            </>
          );
        })}
      </dl>
    </Layout>
  );
}

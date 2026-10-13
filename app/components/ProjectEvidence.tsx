import type { Project } from "../data/projects";
import MethodDiagram from "./MethodDiagram";

/** Shared by the desktop and the readable HTML catalog. */
export default function ProjectEvidence({ project }: { project: Project }) {
  return (
    <>
      {project.figures && <div className="proj-evidence-figures">
        {project.figures.map((figure) => (
          <figure className="proj-artifact" key={figure.src}>
            <img src={figure.src} width={figure.width} height={figure.height} alt={figure.alt} loading="lazy" decoding="async" />
            <figcaption>{figure.caption}</figcaption>
          </figure>
        ))}
      </div>}
      {project.workflow && <MethodDiagram steps={project.workflow} />}
    </>
  );
}

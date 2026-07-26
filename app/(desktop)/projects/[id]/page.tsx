import type { Metadata } from "next";
import SiteDocument from "../../../components/SiteDocument";
import { routeMetadata } from "../../../lib/metadata";
import { PROJECTS } from "../../../data/projects";

/**
 * One route per project, and the reason the whole phase exists: Eric can send
 * a hiring manager a link to a specific piece of work instead of to a desktop
 * they have to be told how to operate.
 *
 * `dynamicParams = false` is what preserves the OS-alert 404 for a garbage id.
 * Without it Next would render this page for any string and SiteDocument would
 * have to invent an empty state.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ id: project.id }));
}

/* Cut on a sentence boundary rather than mid-word. The blurbs run several
   dense sentences and a meta description is truncated around 160 characters
   in practice, so the first sentence or two is what a searcher actually
   reads — chopping it at a character count would strand a half clause. */
function summarize(blurb: string, max = 300): string {
  if (blurb.length <= max) return blurb;
  const cut = blurb.slice(0, max);
  const lastStop = cut.lastIndexOf(". ");
  return lastStop > 0 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}…`;
}

export async function generateMetadata({
  params,
}: {
  /* params is a Promise in Next 16. Awaiting it is not optional. */
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = PROJECTS.find((p) => p.id === id);
  if (!project) return {};

  return routeMetadata({
    title: project.name,
    description: summarize(project.blurb),
    path: `/projects/${project.id}`,
  });
}

export default async function ProjectRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SiteDocument scope="project" projectId={id} />;
}

/**
 * Selected publications, structured so the resume document and the
 * ScholarlyArticle structured data render from one source.
 *
 * `authors` is an ordered list of surname-and-initials strings exactly as
 * they should print; `SELF` marks which entry is Eric so the renderer can
 * bold it without string matching on a name that appears two ways.
 */

export const SELF = "Tang, E. M.";

export type Publication = {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  year: number;
  url: string;
  /** ties back to an entry in data/projects.ts */
  projectId?: string;
};

export const PUBLICATIONS: Publication[] = [
  {
    id: "tracking-2022",
    title: "Automated instrument-tracking for 4D video-rate imaging of ophthalmic surgical maneuvers",
    authors: [SELF, "El-Haddad, M. T.", "Patel, S. N.", "Tao, Y. K."],
    journal: "Biomedical Optics Express",
    volume: "13",
    issue: "3",
    pages: "1471–1484",
    year: 2022,
    url: "https://pubmed.ncbi.nlm.nih.gov/35414968/",
    projectId: "tracking",
  },
  {
    id: "selffusion-2022",
    title: "Real-Time OCT Image Denoising Using Self-Fusion Neural Network",
    authors: ["Rico-Jimenez, J. J.", "Hu, D.", SELF, "Oguz, I.", "Tao, Y. K."],
    journal: "Biomedical Optics Express",
    volume: "13",
    issue: "3",
    pages: "1398–1409",
    year: 2022,
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8973187",
    projectId: "denoise",
  },
  {
    id: "galvo-2021",
    title: "Modeling and optimization of galvanometric point-scanning temporal dynamics",
    authors: [SELF, "Tao, Y. K."],
    journal: "Biomedical Optics Express",
    volume: "12",
    issue: "11",
    pages: "6701–6716",
    year: 2021,
    url: "https://opg.optica.org/boe/fulltext.cfm?uri=boe-12-11-6701",
    projectId: "galvo",
  },
];

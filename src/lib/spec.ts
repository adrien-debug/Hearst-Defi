import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";

const SPEC_DIR = path.join(process.cwd(), "docs", "spec");

export interface SpecFrontmatter {
  title: string;
  order: number;
}

export interface SpecDoc {
  slug: string;
  title: string;
  order: number;
  content: string;
}

export interface SpecIndexEntry {
  slug: string;
  title: string;
  order: number;
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.mdx?$/, "");
}

export async function getSpecIndex(): Promise<SpecIndexEntry[]> {
  const files = await fs.readdir(SPEC_DIR);
  const entries: SpecIndexEntry[] = [];

  for (const file of files) {
    if (!file.endsWith(".mdx") && !file.endsWith(".md")) continue;
    const slug = slugFromFilename(file);
    const raw = await fs.readFile(path.join(SPEC_DIR, file), "utf8");
    const fm = matter(raw).data as Partial<SpecFrontmatter>;
    entries.push({
      slug,
      title: fm.title ?? slug,
      order: typeof fm.order === "number" ? fm.order : 999,
    });
  }

  entries.sort((a, b) => a.order - b.order);
  return entries;
}

export async function getSpecDoc(slug: string): Promise<SpecDoc | null> {
  const candidates = [
    path.join(SPEC_DIR, `${slug}.mdx`),
    path.join(SPEC_DIR, `${slug}.md`),
  ];
  for (const filepath of candidates) {
    try {
      const raw = await fs.readFile(filepath, "utf8");
      const parsed = matter(raw);
      const fm = parsed.data as Partial<SpecFrontmatter>;
      return {
        slug,
        title: fm.title ?? slug,
        order: typeof fm.order === "number" ? fm.order : 999,
        content: parsed.content,
      };
    } catch {
      // try next
    }
  }
  return null;
}

import "server-only";

import fs from "node:fs/promises";
import path from "node:path";

import matter from "gray-matter";
import { z } from "zod";

const SPEC_DIR = path.join(process.cwd(), "docs", "spec");

/**
 * Frontmatter is author-controlled MDX; both fields are optional so an
 * incomplete or malformed block degrades gracefully (slug-based title,
 * order 999) instead of crashing the page build.
 */
const specFrontmatterSchema = z.object({
  title: z.string().optional(),
  order: z.number().optional(),
});

function parseFrontmatter(data: unknown): { title?: string; order?: number } {
  const result = specFrontmatterSchema.safeParse(data);
  return result.success ? result.data : {};
}

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
    const fm = parseFrontmatter(matter(raw).data);
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
  const specDirPrefix = SPEC_DIR.endsWith(path.sep) ? SPEC_DIR : SPEC_DIR + path.sep;
  const candidates = [
    path.join(SPEC_DIR, `${slug}.mdx`),
    path.join(SPEC_DIR, `${slug}.md`),
  ];
  for (const filepath of candidates) {
    // Path traversal guard: resolved path must stay within SPEC_DIR
    if (!filepath.startsWith(specDirPrefix)) continue;
    try {
      const raw = await fs.readFile(filepath, "utf8");
      const parsed = matter(raw);
      const fm = parseFrontmatter(parsed.data);
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

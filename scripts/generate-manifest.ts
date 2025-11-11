/**
 * Generate manifest.json from content directory
 * Scans all markdown files and creates a structured manifest
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface Article {
  title: string;
  slug: string;
  tags: string[];
  folder: string;
}

interface Folder {
  name: string;
  slug: string;
  articles: Article[];
}

interface Manifest {
  folders: Folder[];
  lastUpdated: string;
}

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): {
  title: string;
  tags: string[];
  content: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { title: 'Untitled', tags: [], content };
  }

  const [, frontmatter, body] = match;
  const lines = frontmatter.split('\n');
  let title = 'Untitled';
  let tags: string[] = [];

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();

    if (key === 'title') {
      title = value.replace(/^['"]|['"]$/g, '');
    } else if (key === 'tags') {
      // Parse tags array: [tag1, tag2]
      const tagsMatch = value.match(/\[(.*?)\]/);
      if (tagsMatch) {
        tags = tagsMatch[1]
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }
  }

  return { title, tags, content: body };
}

/**
 * Convert folder name to display name
 */
function folderToDisplayName(folderName: string): string {
  return folderName
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Scan content directory and build manifest
 */
async function generateManifest(): Promise<Manifest> {
  const contentDir = join(process.cwd(), 'content');
  const folders: Folder[] = [];

  // Read all folders in content directory
  const folderNames = await readdir(contentDir, { withFileTypes: true });

  for (const folderEntry of folderNames) {
    if (!folderEntry.isDirectory()) continue;

    const folderName = folderEntry.name;
    const folderPath = join(contentDir, folderName);
    const articles: Article[] = [];

    // Read all markdown files in folder
    const files = await readdir(folderPath);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = join(folderPath, file);
      const content = await readFile(filePath, 'utf-8');
      const { title, tags } = parseFrontmatter(content);

      // Create slug: folder/filename-without-extension
      const fileName = file.replace(/\.md$/, '');
      const slug = `${folderName}/${fileName}`;

      articles.push({
        title,
        slug,
        tags,
        folder: folderName,
      });
    }

    // Sort articles alphabetically by title
    articles.sort((a, b) => a.title.localeCompare(b.title));

    folders.push({
      name: folderToDisplayName(folderName),
      slug: folderName,
      articles,
    });
  }

  // Sort folders alphabetically by name
  folders.sort((a, b) => a.name.localeCompare(b.name));

  return {
    folders,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('Generating manifest.json...');

  const manifest = await generateManifest();
  const outputPath = join(process.cwd(), 'manifest.json');

  await writeFile(outputPath, JSON.stringify(manifest, null, 2));

  console.log(
    `✓ Generated manifest.json with ${manifest.folders.length} folders`,
  );
  console.log(
    `✓ Total articles: ${manifest.folders.reduce((sum, f) => sum + f.articles.length, 0)}`,
  );
}

main().catch((error) => {
  console.error('Failed to generate manifest:', error);
  process.exit(1);
});

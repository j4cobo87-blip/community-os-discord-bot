// CommunityOS Discord Bot - Knowledge Base Service
// Provides KB search, document retrieval, and AI-powered Q&A

import { readdir, readFile } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import { existsSync } from 'node:fs';

const CONTROL_CENTER = process.env.CONTROL_CENTER_PATH || '/Users/jacobogonzalezjaspe/Desktop/CONTROL_CENTER';
const KB_PATH = join(CONTROL_CENTER, 'KB');

// In-memory cache for KB documents
let kbCache = {
  documents: [],
  sections: {},
  lastRefresh: 0,
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * KB sections mapped to directories
 */
const KB_SECTIONS = {
  'start-here': { dir: '00_START_HERE', name: 'Getting Started' },
  'product': { dir: '01_Product', name: 'Product' },
  'market': { dir: '02_Market', name: 'Market & Competition' },
  'sales': { dir: '03_Sales_Marketing', name: 'Sales & Marketing' },
  'architecture': { dir: '04_Architecture', name: 'Architecture' },
  'security': { dir: '05_Security_Governance', name: 'Security & Governance' },
  'operations': { dir: '06_Operations', name: 'Operations' },
  'finance': { dir: '07_Finance', name: 'Finance' },
  'presentations': { dir: '08_Presentations', name: 'Presentations' },
  'projects': { dir: 'projects', name: 'Projects' },
  'agents': { dir: 'agents', name: 'Agents' },
  'workflows': { dir: 'workflows', name: 'Workflows' },
  'streaming': { dir: 'streaming', name: 'Streaming' },
  'community': { dir: 'community', name: 'Community' },
  'support': { dir: 'support', name: 'Support' },
  'api': { dir: 'api', name: 'API Reference' },
};

/**
 * Recursively get all markdown files from a directory
 */
async function getMarkdownFiles(dir, basePath = '') {
  const files = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        // Skip node_modules, hidden dirs, assets
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '99_Assets') {
          continue;
        }
        const subFiles = await getMarkdownFiles(fullPath, relativePath);
        files.push(...subFiles);
      } else if (entry.isFile() && extname(entry.name).toLowerCase() === '.md') {
        files.push({
          path: fullPath,
          relativePath,
          name: basename(entry.name, '.md'),
          filename: entry.name,
        });
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }

  return files;
}

/**
 * Parse frontmatter and extract metadata from markdown
 */
function parseMarkdown(content, filename) {
  const result = {
    title: filename,
    summary: '',
    content: content,
    tags: [],
    section: 'general',
  };

  // Extract frontmatter if present
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];

    // Parse title
    const titleMatch = frontmatter.match(/title:\s*["']?([^"'\n]+)["']?/);
    if (titleMatch) result.title = titleMatch[1].trim();

    // Parse description/summary
    const descMatch = frontmatter.match(/description:\s*["']?([^"'\n]+)["']?/);
    if (descMatch) result.summary = descMatch[1].trim();

    // Parse tags
    const tagsMatch = frontmatter.match(/tags:\s*\[(.*?)\]/);
    if (tagsMatch) {
      result.tags = tagsMatch[1].split(',').map(t => t.trim().replace(/["']/g, ''));
    }

    // Parse section
    const sectionMatch = frontmatter.match(/section:\s*["']?([^"'\n]+)["']?/);
    if (sectionMatch) result.section = sectionMatch[1].trim();

    // Remove frontmatter from content
    result.content = content.replace(frontmatterMatch[0], '').trim();
  }

  // Extract first heading as title if not set
  if (result.title === filename) {
    const headingMatch = result.content.match(/^#\s+(.+)$/m);
    if (headingMatch) result.title = headingMatch[1].trim();
  }

  // Extract first paragraph as summary if not set
  if (!result.summary) {
    const paragraphMatch = result.content.match(/^(?!#)(.{20,200}?)(?:\.|$)/m);
    if (paragraphMatch) result.summary = paragraphMatch[1].trim();
  }

  return result;
}

/**
 * Refresh the KB cache
 */
async function refreshCache() {
  const now = Date.now();
  if (now - kbCache.lastRefresh < CACHE_TTL && kbCache.documents.length > 0) {
    return;
  }

  console.log('Refreshing KB cache...');
  const documents = [];
  const sections = {};

  // Scan all KB sections
  for (const [sectionId, sectionInfo] of Object.entries(KB_SECTIONS)) {
    const sectionPath = join(KB_PATH, sectionInfo.dir);

    if (!existsSync(sectionPath)) continue;

    const files = await getMarkdownFiles(sectionPath);
    sections[sectionId] = [];

    for (const file of files) {
      try {
        const content = await readFile(file.path, 'utf-8');
        const parsed = parseMarkdown(content, file.name);

        const doc = {
          id: `${sectionId}:${file.name}`.toLowerCase().replace(/[^a-z0-9:-]/g, '-'),
          name: file.name,
          filename: file.filename,
          path: file.path,
          relativePath: file.relativePath,
          section: sectionId,
          sectionName: sectionInfo.name,
          ...parsed,
        };

        documents.push(doc);
        sections[sectionId].push(doc);
      } catch (err) {
        console.error(`Error parsing ${file.path}:`, err.message);
      }
    }
  }

  // Also scan root-level files
  const rootFiles = await getMarkdownFiles(KB_PATH);
  for (const file of rootFiles) {
    if (documents.some(d => d.path === file.path)) continue;

    try {
      const content = await readFile(file.path, 'utf-8');
      const parsed = parseMarkdown(content, file.name);

      documents.push({
        id: `root:${file.name}`.toLowerCase().replace(/[^a-z0-9:-]/g, '-'),
        name: file.name,
        filename: file.filename,
        path: file.path,
        relativePath: file.relativePath,
        section: 'root',
        sectionName: 'Root',
        ...parsed,
      });
    } catch (err) {
      console.error(`Error parsing ${file.path}:`, err.message);
    }
  }

  kbCache = {
    documents,
    sections,
    lastRefresh: now,
  };

  console.log(`KB cache refreshed: ${documents.length} documents in ${Object.keys(sections).length} sections`);
}

/**
 * Calculate fuzzy match score between query and text
 */
function fuzzyScore(query, text) {
  if (!text) return 0;

  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match
  if (textLower.includes(queryLower)) {
    return 100;
  }

  // Word match
  const queryWords = queryLower.split(/\s+/);
  const textWords = textLower.split(/\s+/);

  let wordMatches = 0;
  for (const qWord of queryWords) {
    if (textWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
      wordMatches++;
    }
  }

  if (wordMatches > 0) {
    return 50 + (wordMatches / queryWords.length) * 30;
  }

  // Character subsequence match
  let j = 0;
  for (let i = 0; i < textLower.length && j < queryLower.length; i++) {
    if (textLower[i] === queryLower[j]) {
      j++;
    }
  }

  if (j === queryLower.length) {
    return 20;
  }

  return 0;
}

/**
 * Search KB documents with fuzzy matching
 * @param {string} query - Search query
 * @param {object} options - Search options
 * @returns {Array} - Matching documents
 */
export async function searchKB(query, options = {}) {
  await refreshCache();

  const { section = null, limit = 10, minScore = 10 } = options;

  // Filter by section if specified
  let docs = kbCache.documents;
  if (section && kbCache.sections[section]) {
    docs = kbCache.sections[section];
  }

  // Score each document
  const scored = docs.map(doc => {
    const titleScore = fuzzyScore(query, doc.title) * 2; // Title weighted 2x
    const summaryScore = fuzzyScore(query, doc.summary) * 1.5;
    const contentScore = fuzzyScore(query, doc.content.slice(0, 2000)); // First 2000 chars
    const tagScore = doc.tags.some(t => t.toLowerCase().includes(query.toLowerCase())) ? 40 : 0;
    const nameScore = fuzzyScore(query, doc.name) * 1.5;

    const totalScore = Math.max(titleScore, summaryScore, contentScore, tagScore, nameScore);

    return { ...doc, score: totalScore };
  });

  // Filter and sort by score
  return scored
    .filter(doc => doc.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get a specific document by name
 * @param {string} name - Document name (partial match)
 * @returns {object|null} - Document or null if not found
 */
export async function getDocument(name) {
  await refreshCache();

  const nameLower = name.toLowerCase().replace(/\.md$/, '');

  // Exact name match
  let doc = kbCache.documents.find(d =>
    d.name.toLowerCase() === nameLower ||
    d.filename.toLowerCase() === `${nameLower}.md`
  );

  if (doc) return doc;

  // Partial match
  doc = kbCache.documents.find(d =>
    d.name.toLowerCase().includes(nameLower) ||
    d.title.toLowerCase().includes(nameLower)
  );

  return doc || null;
}

/**
 * List all documents, optionally filtered by section
 * @param {string|null} section - Section ID to filter by
 * @returns {Array} - List of documents
 */
export async function listDocuments(section = null) {
  await refreshCache();

  if (section && kbCache.sections[section]) {
    return kbCache.sections[section].map(d => ({
      id: d.id,
      name: d.name,
      title: d.title,
      section: d.sectionName,
      summary: d.summary?.slice(0, 100),
    }));
  }

  return kbCache.documents.map(d => ({
    id: d.id,
    name: d.name,
    title: d.title,
    section: d.sectionName,
    summary: d.summary?.slice(0, 100),
  }));
}

/**
 * List available sections
 * @returns {Array} - List of sections with document counts
 */
export async function listSections() {
  await refreshCache();

  return Object.entries(KB_SECTIONS).map(([id, info]) => ({
    id,
    name: info.name,
    dir: info.dir,
    docCount: kbCache.sections[id]?.length || 0,
  })).filter(s => s.docCount > 0);
}

/**
 * Get a random KB document (for tips)
 * @param {string|null} section - Optional section filter
 * @returns {object} - Random document
 */
export async function getRandomDocument(section = null) {
  await refreshCache();

  let docs = kbCache.documents;
  if (section && kbCache.sections[section]) {
    docs = kbCache.sections[section];
  }

  if (docs.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * docs.length);
  return docs[randomIndex];
}

/**
 * Get KB context for AI Q&A
 * Retrieves relevant documents to build context for AI response
 * @param {string} question - User's question
 * @param {number} maxDocs - Maximum documents to include
 * @returns {string} - Formatted context string
 */
export async function getKBContext(question, maxDocs = 3) {
  const results = await searchKB(question, { limit: maxDocs, minScore: 20 });

  if (results.length === 0) {
    return 'No relevant KB documents found for this question.';
  }

  const contextParts = results.map(doc => {
    // Limit content to first 1500 chars
    const excerpt = doc.content.slice(0, 1500);
    return `=== ${doc.title} (${doc.sectionName}) ===\n${excerpt}\n`;
  });

  return contextParts.join('\n---\n\n');
}

/**
 * AI-powered Q&A using KB context
 * Falls back to context-only response if AI is unavailable
 * @param {string} question - User's question
 * @returns {object} - Answer with sources
 */
export async function askKB(question) {
  const context = await getKBContext(question, 3);
  const results = await searchKB(question, { limit: 3 });

  // Try to call AI endpoint
  const PACO_HUB_URL = process.env.PACO_HUB_URL || 'http://localhost:3010';

  try {
    const res = await fetch(`${PACO_HUB_URL}/api/agents/interact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'docs-librarian',
        message: `Answer this question using the KB context provided:\n\nQuestion: ${question}\n\nContext:\n${context}`,
        context: {
          source: 'discord-kb',
          kbResults: results.map(r => ({ title: r.title, section: r.sectionName })),
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        answer: data.response || data.message,
        sources: results.map(r => ({
          title: r.title,
          section: r.sectionName,
          summary: r.summary,
        })),
        agentName: data.agentName || 'Docs Librarian',
      };
    }
  } catch (err) {
    console.error('AI Q&A error:', err.message);
  }

  // Fallback: Return context-based response
  if (results.length > 0) {
    const topDoc = results[0];
    return {
      success: true,
      answer: `Based on our knowledge base, here's what I found:\n\n**${topDoc.title}**\n${topDoc.summary}\n\n*For more details, check the full document in the ${topDoc.sectionName} section.*`,
      sources: results.map(r => ({
        title: r.title,
        section: r.sectionName,
        summary: r.summary,
      })),
      agentName: 'KB Search',
    };
  }

  return {
    success: false,
    answer: "I couldn't find relevant information in our knowledge base for that question. Try rephrasing or ask a specific agent with `/ask <agent> <question>`.",
    sources: [],
    agentName: 'KB Search',
  };
}

/**
 * Get KB statistics
 * @returns {object} - KB stats
 */
export async function getKBStats() {
  await refreshCache();

  const sectionStats = Object.entries(kbCache.sections).map(([id, docs]) => ({
    section: KB_SECTIONS[id]?.name || id,
    count: docs.length,
  }));

  return {
    totalDocuments: kbCache.documents.length,
    sections: sectionStats,
    lastRefresh: new Date(kbCache.lastRefresh).toISOString(),
  };
}

// Export section definitions for use in commands
export { KB_SECTIONS };

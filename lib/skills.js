/**
 * Curated canonical skill list. Used by:
 *   - /api/skills (autocomplete + filter dropdown)
 *   - Job.skills[] and Profile.skills[] normalization on write
 *
 * Order matters loosely — more common first.
 */
export const SKILLS = [
  // Languages
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "C",
  "C++",
  "C#",
  "PHP",
  "Ruby",
  "Kotlin",
  "Swift",
  "Dart",
  "Scala",
  // Frontend
  "React",
  "Next.js",
  "Vue",
  "Nuxt",
  "Svelte",
  "SvelteKit",
  "Angular",
  "Redux",
  "Tailwind CSS",
  "HTML",
  "CSS",
  "Sass",
  // Backend
  "Node.js",
  "Express",
  "NestJS",
  "FastAPI",
  "Django",
  "Flask",
  "Spring Boot",
  "Laravel",
  "Rails",
  "GraphQL",
  "REST API",
  // Mobile
  "React Native",
  "Flutter",
  "iOS",
  "Android",
  // Data & DB
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "Redis",
  "Elasticsearch",
  "DynamoDB",
  "SQL",
  "NoSQL",
  // Cloud / DevOps
  "AWS",
  "GCP",
  "Azure",
  "Docker",
  "Kubernetes",
  "CI/CD",
  "Terraform",
  "Linux",
  "Nginx",
  // ML / AI
  "Machine Learning",
  "Deep Learning",
  "TensorFlow",
  "PyTorch",
  "NLP",
  "Computer Vision",
  "LLM",
  // Tools & practices
  "Git",
  "GitHub",
  "Testing",
  "Jest",
  "Cypress",
  "Playwright",
  "Agile",
  "Scrum",
  "Figma",
];

const NORMALIZED = new Map(SKILLS.map((s) => [normalize(s), s]));

/**
 * Normalize user input to match a canonical skill name. Case-insensitive,
 * strips extra whitespace and punctuation around the word.
 */
export function normalize(skill) {
  return String(skill || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/**
 * Match a free-text skill against the canonical list (fuzzy). Returns the
 * canonical form if matched, otherwise returns the input as-is (trimmed).
 */
export function canonicalize(skill) {
  const n = normalize(skill);
  if (!n) return "";
  return NORMALIZED.get(n) || String(skill).trim();
}

/**
 * Filter and canonicalize an array of skills; drop empty / dup entries.
 * Returns a sorted, deduped array.
 */
export function cleanSkills(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const c = canonicalize(raw);
    const key = normalize(c);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out.sort();
}

/**
 * Suggest canonical skills matching a prefix (used by /api/search/suggestions).
 */
export function suggestSkills(prefix, limit = 8) {
  const n = normalize(prefix);
  if (!n) return [];
  return SKILLS.filter((s) => normalize(s).includes(n)).slice(0, limit);
}
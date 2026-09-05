const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';

export interface PageData {
  slug: string;
  title: string;
  type: string;
  content: string;
  status?: string;
}

/**
 * LEGACY-040: исход попытки создать сущность. Три значения, а не два, потому что повторный
 * прогон по уже засеянной базе — это норма, а не отказ: бэкенд отвечает на занятый слаг
 * `400 ... already exists` (`books/src/modules/category/category.service.ts:277`), и считать
 * это провалом значило бы краснеть на каждом втором запуске.
 */
export type SeedOutcome = 'created' | 'exists' | 'failed';

export interface SeedResult {
  outcome: SeedOutcome;
  id: string | null;
}

const ALREADY_EXISTS = /already exists/i;

function outcomeOf(error: unknown): 'exists' | 'failed' {
  const message = error instanceof Error ? error.message : String(error);
  return ALREADY_EXISTS.test(message) ? 'exists' : 'failed';
}

let accessToken = '';

export async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error ${response.status}: ${errorBody}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    // `await` here is load-bearing, not decoration: `return response.json()` hands the
    // pending promise to the caller and its rejection never reaches the `catch` below,
    // so a malformed body was reported as an unrelated crash with no endpoint name.
    return await response.json();
  } catch (error) {
    console.error(`❌ Request failed: ${endpoint}`, error);
    throw error;
  }
}

export async function login() {
  console.log('🔑 Logging in...');
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });
  accessToken = data.accessToken;
  console.log('✅ Logged in successfully');
}

export async function createCategory(name: string, slug: string): Promise<SeedResult> {
  try {
    const category = await request('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    });
    console.log(`✅ Category '${name}' created (id: ${category.id})`);
    return { outcome: 'created', id: category.id };
  } catch (e) {
    const outcome = outcomeOf(e);
    console.log(
      outcome === 'exists'
        ? `↷ Category '${name}' already exists, skipping...`
        : `⚠️ Failed to create category '${name}'`
    );
    return { outcome, id: null };
  }
}

export async function createTag(name: string, slug: string): Promise<SeedResult> {
  try {
    const tag = await request('/tags', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    });
    console.log(`✅ Tag '${name}' created (id: ${tag.id})`);
    return { outcome: 'created', id: tag.id };
  } catch (e) {
    const outcome = outcomeOf(e);
    console.log(
      outcome === 'exists'
        ? `↷ Tag '${name}' already exists, skipping...`
        : `⚠️ Failed to create tag '${name}'`
    );
    return { outcome, id: null };
  }
}

export async function createPage(data: PageData): Promise<SeedResult> {
  try {
    // 1. Create page (always draft initially)
    const { status, ...createData } = data;
    const page = await request('/admin/en/pages', {
      method: 'POST',
      body: JSON.stringify(createData),
    });
    console.log(`✅ Page '${data.title}' created (id: ${page.id})`);

    // 2. Publish if requested
    if (status && status !== 'draft') {
      await request(`/admin/pages/${page.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      console.log(`   🚀 Page published`);
    }

    return { outcome: 'created', id: page.id };
  } catch (e) {
    const outcome = outcomeOf(e);
    console.log(
      outcome === 'exists'
        ? `↷ Page '${data.title}' already exists, skipping...`
        : `⚠️ Failed to create page '${data.title}'`
    );
    return { outcome, id: null };
  }
}

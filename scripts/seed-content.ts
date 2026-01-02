const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://api.bibliaris.com/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password';

interface BookVersionData {
  language: string;
  title: string;
  author: string;
  description: string;
  coverImageUrl: string;
  type: 'text' | 'audio';
  isFree: boolean;
}

interface ChapterData {
  number: number;
  title: string;
  content?: string;
  audioUrl?: string;
  duration?: number;
}

interface PageData {
  slug: string;
  title: string;
  type: string;
  content: string;
  status?: string;
}

let accessToken = '';

async function request(endpoint: string, options: RequestInit = {}) {
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

    return response.json();
  } catch (error) {
    console.error(`❌ Request failed: ${endpoint}`, error);
    throw error;
  }
}

async function login() {
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

async function createCategory(name: string, slug: string) {
  try {
    const category = await request('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    });
    console.log(`✅ Category '${name}' created (id: ${category.id})`);
    return category.id;
  } catch (e) {
    console.log(`⚠️ Failed to create category '${name}', skipping...`);
    return null;
  }
}

async function createTag(name: string, slug: string) {
  try {
    const tag = await request('/tags', {
      method: 'POST',
      body: JSON.stringify({ name, slug }),
    });
    console.log(`✅ Tag '${name}' created (id: ${tag.id})`);
    return tag.id;
  } catch (e) {
    console.log(`⚠️ Failed to create tag '${name}', skipping...`);
    return null;
  }
}

async function createBook(slug: string) {
  try {
    const book = await request('/books', {
      method: 'POST',
      body: JSON.stringify({ slug }),
    });
    console.log(`✅ Book container '${slug}' created (id: ${book.id})`);
    return book.id;
  } catch (e) {
    console.log(`⚠️ Failed to create book '${slug}', skipping...`);
    return null;
  }
}

async function createBookVersion(bookId: string, data: BookVersionData) {
  try {
    const version = await request(`/books/${bookId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log(`✅ Version '${data.title}' (${data.language}) created (id: ${version.id})`);
    return version.id;
  } catch (e) {
    console.log(`⚠️ Failed to create version for book ${bookId}, skipping...`);
    return null;
  }
}

async function attachCategory(versionId: string, categoryId: string) {
  await request(`/versions/${versionId}/categories`, {
    method: 'POST',
    body: JSON.stringify({ categoryId }),
  });
}

async function attachTag(versionId: string, tagId: string) {
  await request(`/versions/${versionId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tagId }),
  });
}

async function createChapter(versionId: string, data: ChapterData) {
  await request(`/versions/${versionId}/chapters`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  console.log(`   📄 Chapter '${data.title}' created`);
}

async function publishVersion(versionId: string) {
  await request(`/versions/${versionId}/publish`, {
    method: 'POST', // Assuming POST based on typical action endpoints, though some might use PATCH
  });
  console.log(`   🚀 Version published`);
}

async function createPage(data: PageData) {
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

    return page.id;
  } catch (e) {
    console.log(`⚠️ Failed to create page '${data.title}', skipping...`);
    return null;
  }
}

async function main() {
  try {
    await login();

    // 1. Create Categories
    console.log('\n📚 Creating Categories...');
    const catIds: string[] = [];
    const categories = [
      { name: 'Fiction', slug: 'fiction' },
      { name: 'Science', slug: 'science' },
      { name: 'Classics', slug: 'classics' },
    ];
    for (const cat of categories) {
      const id = await createCategory(cat.name, cat.slug);
      if (id) catIds.push(id);
    }

    // 2. Create Tags
    console.log('\n🏷️ Creating Tags...');
    const tagIds: string[] = [];
    const tags = [
      { name: 'Bestseller', slug: 'bestseller' },
      { name: 'New', slug: 'new' },
      { name: 'Must Read', slug: 'must-read' },
    ];
    for (const tag of tags) {
      const id = await createTag(tag.name, tag.slug);
      if (id) tagIds.push(id);
    }

    // 3. Create Books
    console.log('\n📖 Creating Books...');

    // Book 1: 1984
    const book1Id = await createBook('1984');
    if (book1Id) {
      // Text Version
      const v1Id = await createBookVersion(book1Id, {
        language: 'en',
        title: '1984',
        author: 'George Orwell',
        description: 'Dystopian social science fiction novel...',
        coverImageUrl: 'https://placehold.co/400x600/png?text=1984',
        type: 'text',
        isFree: true,
      });

      if (v1Id) {
        if (catIds[0]) await attachCategory(v1Id, catIds[0]); // Fiction
        if (catIds[2]) await attachCategory(v1Id, catIds[2]); // Classics
        if (tagIds[2]) await attachTag(v1Id, tagIds[2]); // Must Read

        await createChapter(v1Id, {
          number: 1,
          title: 'Chapter 1',
          content:
            '# Chapter 1\n\nIt was a bright cold day in April, and the clocks were striking thirteen...',
        });
        await createChapter(v1Id, {
          number: 2,
          title: 'Chapter 2',
          content:
            '# Chapter 2\n\nAs he put his hand to the door-knob Winston saw that he had left the diary open on the table.',
        });

        await publishVersion(v1Id);
      }

      // Audio Version
      const v1AudioId = await createBookVersion(book1Id, {
        language: 'en',
        title: '1984 (Audiobook)',
        author: 'George Orwell',
        description: 'Audio version of 1984',
        coverImageUrl: 'https://placehold.co/400x600/png?text=1984+Audio',
        type: 'audio',
        isFree: false,
      });

      if (v1AudioId) {
        if (catIds[0]) await attachCategory(v1AudioId, catIds[0]);
        await createChapter(v1AudioId, {
          number: 1,
          title: 'Chapter 1 (Audio)',
          audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
          duration: 360,
        });
        await publishVersion(v1AudioId);
      }
    }

    // Book 2: The Great Gatsby
    const book2Id = await createBook('the-great-gatsby');
    if (book2Id) {
      const v2Id = await createBookVersion(book2Id, {
        language: 'en',
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        description: 'The Great Gatsby is a 1925 novel by American writer F. Scott Fitzgerald.',
        coverImageUrl: 'https://placehold.co/400x600/png?text=Gatsby',
        type: 'text',
        isFree: true,
      });
      if (v2Id) {
        if (catIds[2]) await attachCategory(v2Id, catIds[2]); // Classics
        await publishVersion(v2Id);
      }
    }

    // Book 3: Dune
    const book3Id = await createBook('dune');
    if (book3Id) {
      const v3Id = await createBookVersion(book3Id, {
        language: 'en',
        title: 'Dune',
        author: 'Frank Herbert',
        description: 'Dune is a 1965 epic science fiction novel by American author Frank Herbert.',
        coverImageUrl: 'https://placehold.co/400x600/png?text=Dune',
        type: 'text',
        isFree: false,
      });
      if (v3Id) {
        if (catIds[1]) await attachCategory(v3Id, catIds[1]); // Science
        if (tagIds[0]) await attachTag(v3Id, tagIds[0]); // Bestseller
        await publishVersion(v3Id);
      }
    }

    // 4. Create CMS Pages
    console.log('\n📄 Creating CMS Pages...');
    await createPage({
      slug: 'about-us',
      title: 'About Us',
      type: 'basic',
      content: '# About Us\n\nWe are the best book app in the world.',
      status: 'published',
    });

    await createPage({
      slug: 'terms-of-service',
      title: 'Terms of Service',
      type: 'basic',
      content: '# Terms of Service\n\nPlease read carefully...',
      status: 'published',
    });

    console.log('\n✨ Seeding completed successfully!');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();

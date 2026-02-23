import PocketBase from 'pocketbase';
import type { Prompt, PromptVersion, SavedPrompt } from '../types';

const PB_URL = import.meta.env.VITE_PB_URL || 'http://10.0.2.2:8090';

export const pb = new PocketBase(PB_URL);

// Disable auto-cancellation so concurrent requests don't cancel each other
pb.autoCancellation(false);

// ── File URL helper ──────────────────────────────────────

export function fileUrl(
  collectionId: string,
  recordId: string,
  filename: string,
  thumb?: string
): string {
  if (!filename) return '';
  const base = `${PB_URL}/api/files/${collectionId}/${recordId}/${filename}`;
  return thumb ? `${base}?thumb=${thumb}` : base;
}

export function versionImageUrl(version: PromptVersion, thumb?: string): string {
  return fileUrl('pbc_4213786545', version.id, version.image, thumb);
}

// ── Auth ─────────────────────────────────────────────────

export async function login(email: string, password: string) {
  return pb.collection('users').authWithPassword(email, password);
}

export async function register(email: string, password: string, name?: string) {
  const user = await pb.collection('users').create({
    email,
    password,
    passwordConfirm: password,
    name: name || '',
  });
  // Auto-login after register
  await pb.collection('users').authWithPassword(email, password);
  return user;
}

export function logout() {
  pb.authStore.clear();
}

export function isLoggedIn(): boolean {
  return pb.authStore.isValid;
}

export function currentUser() {
  return pb.authStore.record;
}

// ── Prompts ──────────────────────────────────────────────

export async function fetchPrompts(page = 1, perPage = 20) {
  return pb.collection('prompts').getList<Prompt>(page, perPage, {
    expand: 'currentVersion',
    sort: '-created',
  });
}

export async function fetchPromptById(id: string) {
  return pb.collection('prompts').getOne<Prompt>(id, {
    expand: 'currentVersion',
  });
}

// ── Prompt Versions ──────────────────────────────────────

export async function fetchVersionsForPrompt(promptId: string) {
  return pb.collection('prompt_versions').getFullList<PromptVersion>({
    filter: `prompt = "${promptId}"`,
    sort: 'created',
  });
}

export async function createVersion(
  promptId: string,
  content: string,
  versionName: string,
  createdBy: string
) {
  return pb.collection('prompt_versions').create<PromptVersion>({
    prompt: promptId,
    content,
    versionName,
    createdBy,
  });
}

export async function createVersionWithImage(
  promptId: string,
  content: string,
  versionName: string,
  createdBy: string,
  imageBlob?: Blob
): Promise<PromptVersion> {
  if (imageBlob) {
    const form = new FormData();
    form.append('prompt', promptId);
    form.append('content', content);
    form.append('versionName', versionName);
    form.append('createdBy', createdBy);
    form.append('image', imageBlob, 'generated.png');
    return pb.collection('prompt_versions').create<PromptVersion>(form);
  }
  return createVersion(promptId, content, versionName, createdBy);
}

export async function updatePromptCurrentVersion(
  promptId: string,
  versionId: string
) {
  return pb.collection('prompts').update<Prompt>(promptId, {
    currentVersion: versionId,
  });
}

// ── Saved Prompts ────────────────────────────────────────

export async function fetchSavedPrompts(userId: string) {
  return pb.collection('saved_prompts').getFullList<SavedPrompt>({
    filter: `user = "${userId}"`,
    expand: 'prompt.currentVersion',
    sort: '-created',
  });
}

export async function savePrompt(userId: string, promptId: string) {
  return pb.collection('saved_prompts').create<SavedPrompt>({
    user: userId,
    prompt: promptId,
  });
}

export async function unsavePrompt(savedPromptId: string) {
  return pb.collection('saved_prompts').delete(savedPromptId);
}

export async function findSavedPrompt(userId: string, promptId: string) {
  try {
    const result = await pb.collection('saved_prompts').getFirstListItem<SavedPrompt>(
      `user = "${userId}" && prompt = "${promptId}"`
    );
    return result;
  } catch {
    return null;
  }
}

// ── Categories ───────────────────────────────────────────

export async function fetchCategories() {
  return pb.collection('categories').getFullList<import('../types').Category>({ sort: 'name' });
}

// ── Create new prompt from scratch ───────────────────────

export async function createPromptWithVersion(
  title: string,
  content: string,
  categoryId: string,
  tags: string[],
  userId: string,
  imageBlob?: Blob
): Promise<Prompt> {
  const prompt = await pb.collection('prompts').create<Prompt>({
    title,
    category: categoryId,
    tags,
    owner: userId,
    currentVersion: '',
  });

  let version: PromptVersion;
  if (imageBlob) {
    const form = new FormData();
    form.append('prompt', prompt.id);
    form.append('content', content);
    form.append('versionName', 'v1');
    form.append('createdBy', userId);
    form.append('image', imageBlob, 'generated.png');
    version = await pb.collection('prompt_versions').create<PromptVersion>(form);
  } else {
    version = await pb.collection('prompt_versions').create<PromptVersion>({
      prompt: prompt.id,
      content,
      versionName: 'v1',
      createdBy: userId,
    });
  }

  const updated = await pb.collection('prompts').update<Prompt>(
    prompt.id,
    { currentVersion: version.id },
    { expand: 'currentVersion' }
  );
  return updated;
}

import { describe, it, expect } from 'vitest';
import {
  AUDIO_DESCRIPTION_MAX,
  AUDIO_DURATION_MAX,
  AUDIO_TITLE_MAX,
  audioChapterSchema,
} from '@/components/admin/books/ListenContentTab/AudioChapterModal.types';

const validInput = {
  number: 1,
  title: 'Chapter 1',
  audioUrl: 'https://cdn.example.com/audio/ch-1.mp3',
  mediaId: null,
  duration: 120,
  description: '',
  transcript: '',
};

describe('audioChapterSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = audioChapterSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejects non-http(s) audio URLs', () => {
    const result = audioChapterSchema.safeParse({
      ...validInput,
      audioUrl: 'ftp://cdn.example.com/audio.mp3',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty title', () => {
    const result = audioChapterSchema.safeParse({ ...validInput, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects titles over the max length', () => {
    const tooLong = 'a'.repeat(AUDIO_TITLE_MAX + 1);
    const result = audioChapterSchema.safeParse({ ...validInput, title: tooLong });
    expect(result.success).toBe(false);
  });

  it('rejects fractional chapter numbers', () => {
    const result = audioChapterSchema.safeParse({ ...validInput, number: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects chapter number < 1', () => {
    const result = audioChapterSchema.safeParse({ ...validInput, number: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects duration above 24h', () => {
    const result = audioChapterSchema.safeParse({
      ...validInput,
      duration: AUDIO_DURATION_MAX + 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative duration', () => {
    const result = audioChapterSchema.safeParse({ ...validInput, duration: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects description over the max length', () => {
    const tooLong = 'a'.repeat(AUDIO_DESCRIPTION_MAX + 1);
    const result = audioChapterSchema.safeParse({ ...validInput, description: tooLong });
    expect(result.success).toBe(false);
  });

  it('accepts null mediaId and nullable description/transcript', () => {
    const result = audioChapterSchema.safeParse({
      ...validInput,
      mediaId: null,
      description: null,
      transcript: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-uuid mediaId', () => {
    const result = audioChapterSchema.safeParse({ ...validInput, mediaId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

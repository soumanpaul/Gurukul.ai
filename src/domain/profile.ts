export const languages = ['en', 'hi', 'bn'] as const;
export type Language = typeof languages[number];
export type ProfileAvatar = 'boy' | 'girl';
export type ProfileInput = { nickname: string; language: Language; avatar?: ProfileAvatar };
export type Profile = ProfileInput & { id: string; createdAt: string; updatedAt: string };

export function validateProfile(input: ProfileInput): ProfileInput {
  if (typeof input.nickname !== 'string' || !languages.includes(input.language)) {
    throw new Error('Choose a supported language.');
  }
  const nickname = input.nickname.trim();
  if (!nickname || [...nickname].length > 60 || /[\u0000-\u001f\u007f]/u.test(nickname)) {
    throw new Error('Use a nickname of 1–60 characters without control characters.');
  }
  if (input.avatar !== undefined && input.avatar !== 'boy' && input.avatar !== 'girl') {
    throw new Error('Choose one of the available avatars.');
  }
  return { nickname, language: input.language, ...(input.avatar ? { avatar: input.avatar } : {}) };
}

export const UserType = {
  admin: 1,
  General: 2
} as const;

export type UserType = typeof UserType[keyof typeof UserType];

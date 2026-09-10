declare module 'bcryptjs' {
  export function hash(password: string, salt?: string | number): Promise<string>;
  export function compare(password: string, hash: string): Promise<boolean>;
  export function hashSync(password: string, salt?: string | number): string;
  export function compareSync(password: string, hash: string): boolean;
  export function genSalt(rounds?: number): string;
  export function genSaltSync(rounds?: number): string;
}

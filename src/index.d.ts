export type Payload = { room: string; exp: number; [claim: string]: unknown };

export function now(): number;
export function encodeJson(value: unknown): string;
export function signJson(json: string, secret: string): string;
export function sign(payload: Payload, secret: string): string;
export function mint(options: { secret: string; room: string; ttl?: number; claims?: Record<string, unknown>; at?: number }): { token: string; room: string; expires: number; claims: Record<string, unknown> };
export function verify(token: string, secret: string, room: string, options?: { at?: number }): Payload | null;

export const HEARTBEAT_PREFIX: 'heartbeat:';
export type Health = 'starting' | 'healthy' | 'draining' | 'down';
export type HeartbeatOptions = {
  url: string;
  secret: string;
  server: string;
  service: string;
  players?: number;
  health?: Health;
  address?: string;
  capacity?: number;
  region?: string;
  tags?: string[];
  engine?: string;
  fetch?: typeof fetch;
  at?: number;
};
export type HeartbeatAnswer = { status: number; body: unknown };
export function heartbeatToken(server: string, secret: string, options?: { ttl?: number; at?: number }): string;
export function fromEnv(env?: Record<string, string | undefined>, options?: { secretVariable?: string }): { secret?: string; server?: string; room?: string; service?: string; capacity?: number; port?: number; engine?: string; heartbeatUrl?: string };
export function sendHeartbeat(options: HeartbeatOptions): Promise<HeartbeatAnswer>;
export function startHeartbeat(options: Omit<HeartbeatOptions, 'players' | 'health'> & { every?: number; state?: () => { players?: number; health?: Health }; onAnswer?: (answer: HeartbeatAnswer) => void; onError?: (error: unknown) => void }): { stop(): void; beat(): Promise<HeartbeatAnswer | null> };

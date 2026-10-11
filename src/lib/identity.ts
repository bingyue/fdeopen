import { AppError } from './validation';
export type VerifiedOAuthUser = {
  id: string;
  user_metadata: Record<string, unknown>;
  identities?: { id: string; provider: string; identity_data?: Record<string, unknown> }[];
};
export function githubIdentity(user: VerifiedOAuthUser) {
  // Only provider-managed identity data is authoritative. user_metadata is editable by the user.
  const identity = user.identities?.find((i) => i.provider === 'github');
  if (!identity) throw new AppError('尚未绑定经过验证的 GitHub 身份', 403);
  const data = identity.identity_data || {};
  const candidate = String(data.user_name || data.preferred_username || data.login || '');
  const username = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(candidate) ? candidate : '';
  return {
    githubId: String(data.provider_id || data.sub || identity.id),
    handle: `${username || 'builder'}-${user.id.slice(0, 8)}`,
    name: String(data.full_name || username || 'GitHub 开发者').slice(0, 60),
    githubUrl: username ? `https://github.com/${username}` : '',
  };
}

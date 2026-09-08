import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';
import { inviteMemberAction } from './actions';
import { RoleName } from '@prisma/client';

export default async function TeamPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await resolveTenant(org);

  const [members, invitations] = await Promise.all([
    db.membership.findMany({ where: { organizationId: ctx.organization.id }, include: { user: true } }),
    db.invitation.findMany({ where: { organizationId: ctx.organization.id, acceptedAt: null } }),
  ]);

  const invite = inviteMemberAction.bind(null, org);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Équipe</h1>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Membres</h2>
        <ul className="mt-3 space-y-2">
          {members.map((m) => (
            <li key={m.id} className="flex justify-between text-sm">
              <span>{m.user.name ?? m.user.email}</span>
              <span className="text-muted-foreground">{m.role}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Invitations en attente</h2>
        <ul className="mt-3 space-y-2">
          {invitations.map((i) => (
            <li key={i.id} className="flex justify-between text-sm">
              <span>{i.email}</span>
              <span className="text-muted-foreground">{i.role}</span>
            </li>
          ))}
          {invitations.length === 0 && <li className="text-sm text-muted-foreground">Aucune invitation en attente.</li>}
        </ul>

        <form action={invite} className="mt-4 flex gap-2">
          <input
            name="email"
            type="email"
            required
            placeholder="email@exemple.com"
            className="flex-1 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm"
          />
          <select name="role" className="rounded-lg border border-border bg-surface-raised px-2 py-2 text-sm">
            {Object.values(RoleName).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-start-gradient px-4 py-2 text-sm font-medium text-white">
            Inviter
          </button>
        </form>
      </div>
    </div>
  );
}

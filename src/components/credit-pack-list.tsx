import { CREDIT_PACKS, formatPriceCents } from '@/config/pricing';
import { checkoutCreditPackAction } from '@/app/w/[org]/settings/billing/actions';

export default function CreditPackList({ org }: { org: string }) {
  return (
    <div id="credits" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {CREDIT_PACKS.map((pack, index) => {
        const action = checkoutCreditPackAction.bind(null, org, index);
        return (
          <form key={pack.credits} action={action} className="rounded-2xl border border-border bg-surface p-5 text-center">
            <div className="text-2xl font-bold">{pack.credits}</div>
            <div className="text-xs text-muted-foreground">STARS Credits</div>
            <div className="mt-2 font-medium">{formatPriceCents(pack.priceCents)}</div>
            <div className="text-xs text-muted-foreground">Valable {pack.validityMonths} mois</div>
            <button type="submit" className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium hover:border-accent-cyan">
              Acheter
            </button>
          </form>
        );
      })}
    </div>
  );
}

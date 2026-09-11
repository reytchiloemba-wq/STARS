import { CREDIT_PACKS, formatPriceCents } from '@/config/pricing';
import { checkoutCreditPackAction } from '@/app/w/[org]/settings/billing/actions';

export default function CreditPackList({ org }: { org: string }) {
  return (
    <div id="credits" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {CREDIT_PACKS.map((pack, index) => {
        const action = checkoutCreditPackAction.bind(null, org, index);
        return (
          <form
            key={pack.credits}
            action={action}
            className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 text-center shadow-sm hover:border-accent-cyan/40 transition-colors"
          >
            <div>
              <div className="font-display text-3xl font-extrabold text-white">{pack.credits}</div>
              <div className="text-xs font-semibold text-accent-cyan uppercase tracking-wider">SIC</div>
              <div className="mt-2 font-display text-lg font-bold text-foreground">{formatPriceCents(pack.priceCents)} HT</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Valable {pack.validityMonths} mois</div>
            </div>
            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-start-gradient py-2 text-xs font-bold text-white shadow hover:scale-[1.02] transition-transform"
            >
              Recharger
            </button>
          </form>
        );
      })}
    </div>
  );
}

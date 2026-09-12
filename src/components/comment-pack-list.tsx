import { COMMENT_PACKS, formatPriceCents } from '@/config/pricing';
import { checkoutCommentPackAction } from '@/app/w/[org]/settings/billing/actions';

export default function CommentPackList({ org }: { org: string }) {
  return (
    <div id="comment-packs" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {COMMENT_PACKS.map((pack, index) => {
        const action = checkoutCommentPackAction.bind(null, org, index);
        return (
          <form
            key={pack.comments}
            action={action}
            className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 text-center shadow-sm hover:border-accent-cyan/40 transition-colors"
          >
            <div>
              <div className="font-display text-3xl font-extrabold text-white">{pack.comments.toLocaleString('fr-FR')}</div>
              <div className="text-xs font-semibold text-accent-cyan uppercase tracking-wider">Commentaires</div>
              <div className="mt-2 font-display text-lg font-bold text-foreground">{formatPriceCents(pack.priceCents)} HT</div>
              <div className="mt-1 text-[11px] text-muted-foreground">Sans expiration, en plus de votre quota mensuel</div>
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

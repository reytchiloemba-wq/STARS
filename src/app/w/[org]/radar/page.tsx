import { resolveTenant } from '@/lib/tenant';
import { RadarService } from '@/server/services/radar.service';
import Link from 'next/link';

export default async function RadarPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ topic?: string }>;
}) {
  const { org } = await params;
  const { topic: queryTopic } = await searchParams;
  await resolveTenant(org);

  const weakSignals = await RadarService.getWeakSignals();
  const currentTopic = queryTopic || 'Réglementation et souveraineté des modèles IA';
  const narrativeData = await RadarService.getNarrativeMap(currentTopic);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Radar Mondial & Signaux Faibles</h1>
          <p className="text-sm text-muted-foreground">
            Anticipez les ruptures, comparez les prismes régionaux et identifiez les angles originaux non saturés.
          </p>
        </div>
        <span className="demo-badge shrink-0">Démonstration</span>
      </div>
      <p className="-mt-6 text-xs text-muted-foreground">
        Ce module illustre le rendu final. Il n&apos;est pas encore connecté à un pipeline de veille réel — voir{' '}
        <a href="/admin/infrastructure" className="underline">
          Infrastructure &amp; Connexions
        </a>
        .
      </p>

      {/* Signaux faibles détectés */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📡</span>
            <h2 className="text-base font-bold text-foreground">Signaux Faibles & Détection de Ruptures</h2>
          </div>
          <span className="text-xs text-muted-foreground">Exemple illustratif</span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {weakSignals.map((ws) => {
            const badgeColor =
              ws.signalStrength === 'RUPTURE'
                ? 'bg-danger/15 text-danger border-danger/30'
                : ws.signalStrength === 'EN_ACCÉLÉRATION'
                ? 'bg-warning/15 text-warning border-warning/30'
                : 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30';

            return (
              <div
                key={ws.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-surface-raised p-4 transition hover:border-accent-cyan"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-muted-foreground">{ws.category}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeColor}`}>
                      {ws.signalStrength} (Vélocité {ws.velocityScore}%)
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground">{ws.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    💡 <span className="font-medium text-foreground">Opportunité :</span> {ws.editorialOpportunity}
                  </p>
                  {ws.reputationalRiskNote && (
                    <p className="text-xs text-danger/90 leading-relaxed">
                      ⚠️ <span className="font-medium">Risque :</span> {ws.reputationalRiskNote}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-xs">
                  <div className="flex gap-1">
                    {ws.relatedEntities.map((ent, idx) => (
                      <span key={idx} className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {ent}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/w/${org}/studio?title=${encodeURIComponent(ws.title)}&summary=${encodeURIComponent(ws.editorialOpportunity)}`}
                    className="font-bold text-accent-cyan hover:underline"
                  >
                    Préparer un post →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Carte des narratifs */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-border pb-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🗺️</span>
              <h2 className="text-base font-bold text-foreground">Carte des Narratifs Régionaux</h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Sujet analysé : <span className="font-semibold text-foreground">« {narrativeData.topic} »</span>
            </p>
          </div>
          <Link
            href={`/w/${org}/direct?q=${encodeURIComponent(narrativeData.topic)}`}
            className="text-xs font-semibold text-accent-cyan hover:underline"
          >
            Analyser ce sujet dans STARS Direct →
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {narrativeData.perspectives.map((p, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface-raised p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-accent-cyan">{p.region}</span>
                <span className="text-[10px] text-muted-foreground">Indice {p.confidence}%</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground">Prisme dominant :</span>
                <p className="text-xs text-foreground mt-0.5">{p.dominantFraming}</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground">Inquiétudes clés :</span>
                <p className="text-xs text-muted-foreground mt-0.5">{p.keyConcerns}</p>
              </div>
              <div className="border-t border-border pt-2 text-[11px] italic text-muted-foreground">
                Média type : {p.mediaAngle}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Content Gap & Détecteur d'Angles Saturés */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🎯</span>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
              Content Gap (Questions sous-traitées)
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Sujets et questions stratégiques à fort potentiel sur lesquels vos concurrents ne se sont pas encore exprimés :
          </p>
          <ul className="space-y-2 text-xs text-foreground">
            {narrativeData.contentGap.map((cg, i) => (
              <li key={i} className="flex items-start gap-2 rounded-xl bg-surface-raised p-3">
                <span className="text-accent-cyan font-bold">✓</span>
                <span>{cg}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🚫</span>
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
              Détecteur d&apos;Angles Saturés
            </h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Angles déjà massivement traités par les médias et réseaux à éviter pour préserver votre crédibilité :
          </p>
          <ul className="space-y-2 text-xs text-muted-foreground">
            {narrativeData.saturatedAngles.map((sa, i) => (
              <li key={i} className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-danger/90">
                <span>✕</span>
                <span>{sa}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

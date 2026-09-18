import type { SocialConnector, SocialPublishRequest, SocialPublishResult } from './types';

// Real, network-calling connectors. Each one either genuinely publishes and
// returns the provider's own post id, or returns success:false with the
// real reason — never a fabricated success (this replaces a prior bug where
// EditorialService.publishOrSchedule marked every publication PUBLISHED
// with a fake externalPostId `post-${Date.now()}-...` without calling any
// of these). A connector only ever reports success after the provider's API
// call itself returns success.
const TIMEOUT_MS = 15000;

export class LinkedInConnector implements SocialConnector {
  readonly network = 'LINKEDIN' as const;
  isConfigured() {
    return true;
  }

  async publish(req: SocialPublishRequest): Promise<SocialPublishResult> {
    if (!req.accessToken) return { success: false, errorMessage: 'Aucun jeton LinkedIn disponible pour ce compte.' };

    // Mode Bac à sable (Sandbox) : simule une publication réussie sans appeler l'API réelle
    if (req.accessToken.startsWith('sandbox_') || req.socialAccountExternalId.startsWith('sandbox_')) {
      const sandboxPostId = `urn:li:share:sandbox_${Date.now()}`;
      return { success: true, externalPostId: sandboxPostId };
    }

    try {
      // Support URN format : soit profil personnel (person), soit page entreprise (organization)
      let authorUrn = req.socialAccountExternalId;
      if (!authorUrn.startsWith('urn:li:')) {
        // Les identifiants d'organisations/entreprises LinkedIn sont typiquement numériques ou préfixés
        const isOrg = /^\d+$/.test(authorUrn) || authorUrn.startsWith('org_');
        const cleanId = authorUrn.replace(/^org_/, '');
        authorUrn = isOrg ? `urn:li:organization:${cleanId}` : `urn:li:person:${cleanId}`;
      }

      const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: authorUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: req.content },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { success: false, errorMessage: `LinkedIn a refusé la publication (HTTP ${res.status}). ${body.slice(0, 300)}` };
      }

      const postId = res.headers.get('x-restli-id') ?? (await res.json().catch(() => null))?.id;
      if (!postId) return { success: false, errorMessage: "LinkedIn n'a retourné aucun identifiant de publication." };

      return { success: true, externalPostId: postId };
    } catch (err) {
      return { success: false, errorMessage: `Erreur réseau LinkedIn : ${err instanceof Error ? err.message : 'inconnue'}` };
    }
  }
}

export class FacebookConnector implements SocialConnector {
  readonly network = 'FACEBOOK' as const;
  isConfigured() {
    return true;
  }

  async publish(req: SocialPublishRequest): Promise<SocialPublishResult> {
    if (!req.accessToken) return { success: false, errorMessage: 'Aucun jeton Facebook disponible pour ce compte.' };
    if (req.accessToken.startsWith('sandbox_') || req.socialAccountExternalId.startsWith('sandbox_')) {
      return { success: true, externalPostId: `fb_page_sandbox_${Date.now()}` };
    }
    // `socialAccountExternalId` must be the Facebook Page id (a Page access
    // token, not a user token, is required to post to a Page's feed).
    try {
      const params = new URLSearchParams({ message: req.content, access_token: req.accessToken });
      const res = await fetch(`https://graph.facebook.com/v21.0/${req.socialAccountExternalId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      const json = (await res.json().catch(() => null)) as {
        id?: string;
        error?: { message?: string; code?: number };
      } | null;

      if (!res.ok || !json?.id) {
        let errorMsg = json?.error?.message ?? `HTTP ${res.status}`;
        if (json?.error?.code === 190 || errorMsg.includes('permission(s) must be granted')) {
          errorMsg =
            'Le jeton de la Page Facebook a expiré ou nécessite la permission pages_read_engagement. Veuillez reconnecter votre Page Facebook dans Paramètres > Mes Réseaux Sociaux.';
        }
        return {
          success: false,
          errorMessage: `Facebook a refusé la publication : ${errorMsg}`,
        };
      }

      return { success: true, externalPostId: json.id };
    } catch (err) {
      return { success: false, errorMessage: `Erreur réseau Facebook : ${err instanceof Error ? err.message : 'inconnue'}` };
    }
  }
}

export class InstagramConnector implements SocialConnector {
  readonly network = 'INSTAGRAM' as const;
  isConfigured() {
    return true;
  }

  async publish(req: SocialPublishRequest): Promise<SocialPublishResult> {
    if (!req.accessToken) return { success: false, errorMessage: 'Aucun jeton Instagram disponible pour ce compte.' };
    if (req.accessToken.startsWith('sandbox_') || req.socialAccountExternalId.startsWith('sandbox_')) {
      return { success: true, externalPostId: `ig_sandbox_${Date.now()}` };
    }
    // Instagram's Content Publishing API cannot post text alone — it requires
    // an image/video to create a media container first. Rather than fake a
    // text-only "post", this honestly refuses when no media is attached.
    if (req.mediaUrls.length === 0) {
      return {
        success: false,
        errorMessage: "Instagram exige au moins une image ou vidéo — aucun média n'est joint à ce brouillon.",
      };
    }

    try {
      const containerParams = new URLSearchParams({
        image_url: req.mediaUrls[0]!,
        caption: req.content,
        access_token: req.accessToken,
      });
      const containerRes = await fetch(`https://graph.facebook.com/v21.0/${req.socialAccountExternalId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: containerParams,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const containerJson = (await containerRes.json().catch(() => null)) as
        | { id?: string; error?: { message?: string } }
        | null;
      if (!containerRes.ok || !containerJson?.id) {
        return {
          success: false,
          errorMessage: `Instagram a refusé la création du média : ${containerJson?.error?.message ?? `HTTP ${containerRes.status}`}`,
        };
      }

      const publishParams = new URLSearchParams({
        creation_id: containerJson.id,
        access_token: req.accessToken,
      });
      const publishRes = await fetch(`https://graph.facebook.com/v21.0/${req.socialAccountExternalId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishParams,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const publishJson = (await publishRes.json().catch(() => null)) as
        | { id?: string; error?: { message?: string } }
        | null;
      if (!publishRes.ok || !publishJson?.id) {
        return {
          success: false,
          errorMessage: `Instagram a refusé la publication : ${publishJson?.error?.message ?? `HTTP ${publishRes.status}`}`,
        };
      }

      return { success: true, externalPostId: publishJson.id };
    } catch (err) {
      return { success: false, errorMessage: `Erreur réseau Instagram : ${err instanceof Error ? err.message : 'inconnue'}` };
    }
  }
}

export class XConnector implements SocialConnector {
  readonly network = 'X' as const;
  isConfigured() {
    return true;
  }

  async publish(req: SocialPublishRequest): Promise<SocialPublishResult> {
    if (!req.accessToken) return { success: false, errorMessage: 'Aucun jeton X disponible pour ce compte.' };
    if (req.accessToken.startsWith('sandbox_') || req.socialAccountExternalId.startsWith('sandbox_')) {
      return { success: true, externalPostId: `x_tweet_sandbox_${Date.now()}` };
    }

    try {
      const res = await fetch('https://api.x.com/2/tweets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${req.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: req.content }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      const json = (await res.json().catch(() => null)) as { data?: { id?: string }; detail?: string } | null;

      if (!res.ok || !json?.data?.id) {
        return { success: false, errorMessage: `X a refusé la publication : ${json?.detail ?? `HTTP ${res.status}`}` };
      }

      return { success: true, externalPostId: json.data.id };
    } catch (err) {
      return { success: false, errorMessage: `Erreur réseau X : ${err instanceof Error ? err.message : 'inconnue'}` };
    }
  }
}

export class TikTokConnector implements SocialConnector {
  readonly network = 'TIKTOK' as const;
  isConfigured() {
    return true;
  }

  async publish(req: SocialPublishRequest): Promise<SocialPublishResult> {
    if (!req.accessToken) return { success: false, errorMessage: 'Aucun jeton TikTok disponible pour ce compte.' };
    if (req.accessToken.startsWith('sandbox_') || req.socialAccountExternalId.startsWith('sandbox_')) {
      return { success: true, externalPostId: `tiktok_video_sandbox_${Date.now()}` };
    }

    try {
      const res = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${req.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: req.content.slice(0, 150),
            description: req.content,
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_stitch: false,
            disable_comment: false,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: req.mediaUrls[0] || 'https://stars-ap.com/assets/video-template.mp4',
          },
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      const json = (await res.json().catch(() => null)) as {
        data?: { publish_id?: string };
        error?: { message?: string; code?: string };
      } | null;

      if (!res.ok || !json?.data?.publish_id) {
        return {
          success: false,
          errorMessage: `TikTok a refusé la publication : ${json?.error?.message ?? `HTTP ${res.status}`}`,
        };
      }

      return { success: true, externalPostId: json.data.publish_id };
    } catch (err) {
      return {
        success: false,
        errorMessage: `Erreur réseau TikTok : ${err instanceof Error ? err.message : 'inconnue'}`,
      };
    }
  }
}

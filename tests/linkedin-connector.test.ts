import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LinkedInConnector } from '@/server/adapters/social/real';

describe('LinkedInConnector Image & Text Publishing', () => {
  const connector = new LinkedInConnector();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('publishes text-only post when no media is attached', async () => {
    let capturedBody: any = null;
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      if (url.includes('/v2/ugcPosts')) {
        capturedBody = JSON.parse(opts.body);
        return {
          ok: true,
          status: 201,
          headers: new Headers({ 'x-restli-id': 'urn:li:share:123456' }),
          json: async () => ({ id: 'urn:li:share:123456' }),
        };
      }
      return { ok: false, status: 404 };
    });

    const result = await connector.publish({
      organizationId: 'org_1',
      socialAccountExternalId: 'urn:li:person:user_abc',
      accessToken: 'valid_oauth_token',
      network: 'LINKEDIN',
      content: 'Hello LinkedIn network!',
      mediaUrls: [],
      idempotencyKey: 'idem-test-1',
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBe('urn:li:share:123456');
    expect(capturedBody.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory).toBe('NONE');
    expect(capturedBody.specificContent['com.linkedin.ugc.ShareContent'].shareCommentary.text).toBe('Hello LinkedIn network!');
    expect(capturedBody.specificContent['com.linkedin.ugc.ShareContent'].media).toBeUndefined();
  });

  it('registers upload, performs binary upload, and publishes native IMAGE post when media is attached (organization)', async () => {
    const fetchCalls: { url: string; method?: string; headers?: any; body?: any }[] = [];

    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      fetchCalls.push({ url, method: opts?.method, headers: opts?.headers, body: opts?.body });

      // 1. Fetch source image
      if (url === 'https://images.unsplash.com/photo-test-123') {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'image/jpeg' }),
          arrayBuffer: async () => new ArrayBuffer(1024),
        };
      }

      // 2. LinkedIn registerUpload
      if (url.includes('/v2/assets?action=registerUpload')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: {
              uploadMechanism: {
                'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                  uploadUrl: 'https://api.linkedin.com/mediaUpload/signed-upload-token-xyz',
                  headers: {},
                },
              },
              asset: 'urn:li:digitalmediaAsset:D5505AQF_custom_asset_123',
            },
          }),
        };
      }

      // 3. Binary upload to pre-signed URL
      if (url === 'https://api.linkedin.com/mediaUpload/signed-upload-token-xyz') {
        return {
          ok: true,
          status: 201,
        };
      }

      // 4. Create UGC Post
      if (url.includes('/v2/ugcPosts')) {
        return {
          ok: true,
          status: 201,
          headers: new Headers({ 'x-restli-id': 'urn:li:share:ugc_with_image_999' }),
          json: async () => ({ id: 'urn:li:share:ugc_with_image_999' }),
        };
      }

      return { ok: false, status: 404 };
    });

    const result = await connector.publish({
      organizationId: 'org_1',
      socialAccountExternalId: 'urn:li:organization:company_456',
      accessToken: 'valid_oauth_token',
      network: 'LINKEDIN',
      content: 'Exciting breakthrough in quantum computing! Check out our new findings.',
      mediaUrls: ['https://images.unsplash.com/photo-test-123'],
      idempotencyKey: 'idem-test-2',
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBe('urn:li:share:ugc_with_image_999');

    // Verify registerUpload was called with owner: urn:li:organization:company_456
    const registerCall = fetchCalls.find((c) => c.url.includes('/v2/assets?action=registerUpload'));
    expect(registerCall).toBeDefined();
    const parsedRegister = JSON.parse(registerCall?.body);
    expect(parsedRegister.registerUploadRequest.recipes).toContain('urn:li:digitalmediaRecipe:feedshare-image');
    expect(parsedRegister.registerUploadRequest.owner).toBe('urn:li:organization:company_456');

    // Verify binary upload was called with PUT and Authorization header
    const binaryCall = fetchCalls.find((c) => c.url === 'https://api.linkedin.com/mediaUpload/signed-upload-token-xyz');
    expect(binaryCall).toBeDefined();
    expect(binaryCall?.method).toBe('PUT');
    expect(binaryCall?.headers?.Authorization).toBe('Bearer valid_oauth_token');
    expect(binaryCall?.headers?.['Content-Type']).toBe('image/jpeg');

    // Verify ugcPosts was called with shareMediaCategory: "IMAGE" and the real asset URN
    const postCall = fetchCalls.find((c) => c.url.includes('/v2/ugcPosts'));
    expect(postCall).toBeDefined();
    const parsedPost = JSON.parse(postCall?.body);
    expect(parsedPost.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory).toBe('IMAGE');
    expect(parsedPost.specificContent['com.linkedin.ugc.ShareContent'].media).toEqual([
      {
        status: 'READY',
        media: 'urn:li:digitalmediaAsset:D5505AQF_custom_asset_123',
        title: { text: 'Exciting breakthrough in quantum computing! Check out our new findings.' },
      },
    ]);
  });

  it('handles Base64 data:image/... uploads and personal profile numeric sub IDs correctly', async () => {
    const fetchCalls: { url: string; method?: string; headers?: any; body?: any }[] = [];

    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      fetchCalls.push({ url, method: opts?.method, headers: opts?.headers, body: opts?.body });

      // LinkedIn registerUpload
      if (url.includes('/v2/assets?action=registerUpload')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: {
              uploadMechanism: {
                'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
                  uploadUrl: 'https://api.linkedin.com/mediaUpload/upload-for-base64',
                  headers: {},
                },
              },
              asset: 'urn:li:digitalmediaAsset:BASE64_ASSET_777',
            },
          }),
        };
      }

      // Binary upload
      if (url === 'https://api.linkedin.com/mediaUpload/upload-for-base64') {
        return {
          ok: true,
          status: 201,
        };
      }

      // UGC Post
      if (url.includes('/v2/ugcPosts')) {
        return {
          ok: true,
          status: 201,
          headers: new Headers({ 'x-restli-id': 'urn:li:share:share_from_base64' }),
          json: async () => ({ id: 'urn:li:share:share_from_base64' }),
        };
      }

      return { ok: false, status: 404 };
    });

    // Minimal 1x1 transparent PNG as base64 data URL
    const pngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const result = await connector.publish({
      organizationId: 'org_1',
      // Numeric ID from LinkedIn OpenID sub should resolve to urn:li:person:8675309, NOT organization
      socialAccountExternalId: '8675309',
      accessToken: 'member_personal_token',
      network: 'LINKEDIN',
      content: 'Post with uploaded local file image',
      mediaUrls: [pngBase64],
      idempotencyKey: 'idem-test-3',
    });

    expect(result.success).toBe(true);
    expect(result.externalPostId).toBe('urn:li:share:share_from_base64');

    // Register upload should have owner: urn:li:person:8675309
    const registerCall = fetchCalls.find((c) => c.url.includes('/v2/assets?action=registerUpload'));
    expect(registerCall).toBeDefined();
    const parsedRegister = JSON.parse(registerCall?.body);
    expect(parsedRegister.registerUploadRequest.owner).toBe('urn:li:person:8675309');

    // Binary upload should have Content-Type: image/png
    const binaryCall = fetchCalls.find((c) => c.url === 'https://api.linkedin.com/mediaUpload/upload-for-base64');
    expect(binaryCall).toBeDefined();
    expect(binaryCall?.headers?.['Content-Type']).toBe('image/png');
    expect(binaryCall?.body).toBeInstanceOf(Uint8Array);
  });

  it('fails with explicit error instead of silent text-only fallback when image upload fails', async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === 'https://images.unsplash.com/broken-photo') {
        return { ok: false, status: 404 };
      }
      return { ok: false, status: 500 };
    });

    const result = await connector.publish({
      organizationId: 'org_1',
      socialAccountExternalId: 'urn:li:person:user_xyz',
      accessToken: 'valid_oauth_token',
      network: 'LINKEDIN',
      content: 'Post that should fail because image is 404',
      mediaUrls: ['https://images.unsplash.com/broken-photo'],
      idempotencyKey: 'idem-test-4',
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain("Échec du téléversement de l'image");
  });
});

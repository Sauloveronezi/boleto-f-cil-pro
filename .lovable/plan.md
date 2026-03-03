

## Diagnosis

Three issues identified:

### 1. Logo upload fails
The bucket `boleto_templates` is **private**, but `handleLogoFileChange` uses `getPublicUrl()` (line 181-183 of `Bancos.tsx`), which returns a URL that requires the bucket to be public. The fix is to use `createSignedUrl()` instead, or store just the **storage path** (e.g., `logos/banco_033.png`) and resolve it at render time.

**Best approach**: Store the relative storage path in `logo_url` and generate a signed URL only for preview. The renderer (`fetchImageBytes`) also needs to handle private bucket URLs by generating signed URLs.

### 2. Border around logo, bank name, and bank code
In `templateRendererV2.ts` line 278-281, when `usarFundo=false` (which is the default now), `drawGrid=true` and borders are drawn for all fields except barcode/digitable line. The header fields (`banco_logo`, `banco_nome`, `banco_codigo_formatado`) get borders. Need to skip borders for these header fields too.

### 3. Logo legibility in PDF
The logo bbox `[5, 3, 20, 13]` = 15×10mm. The proportional scaling logic is correct, but `fetchImageBytes` will fail on private bucket URLs (same issue as #1). Once the URL resolves correctly, the logo should render fine. May also need slight padding adjustment.

## Plan

### Task 1: Fix logo upload (private bucket)
**In `src/pages/Bancos.tsx`:**
- Replace `getPublicUrl()` with `createSignedUrl()` for the preview after upload
- Store the **storage path** (e.g., `logos/banco_033.png`) in the database `logo_url` field
- When displaying the logo in the UI (card + dialog), generate a signed URL on the fly or use the `logoUrl` state with a signed URL for preview only

### Task 2: Fix logo fetching in renderer
**In `src/lib/templateRendererV2.ts`:**
- Update `fetchImageBytes` to detect Supabase storage paths and generate signed URLs before fetching, similar to how `fetchPdf` already handles this

### Task 3: Remove borders from header fields
**In `src/lib/templateRendererV2.ts`:**
- Extend the `skipBorder` condition (line 279) to also skip borders for `banco_logo`, `banco_nome`, and `banco_codigo_formatado` keys (and their `via2_` variants)

### Task 4: Ensure logo legibility
- Keep current bbox dimensions (15×10mm is appropriate for a miniature)
- The proportional scaling logic already handles aspect ratio correctly
- Add a small inner margin (1pt padding) when drawing the logo to prevent edge clipping

### Files to modify:
- `src/pages/Bancos.tsx` — fix upload to use signed URLs + store path
- `src/lib/templateRendererV2.ts` — fix `fetchImageBytes` for private storage + skip header borders


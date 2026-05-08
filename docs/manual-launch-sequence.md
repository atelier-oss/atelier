# Manual launch sequence (after Claude prep at commit 7a02ea8)

All Claude-executable work is done. The following are 2FA-gated or
require interactive auth — Alex only.

Current state:
- Repo: `https://github.com/7alexhale5-rgb/atelier` (PRIVATE, staging)
- Version: 0.1.0 across all 6 packages (changeset committed)
- Tarballs: built clean, NOTICE present, smoke install passes
- CI: green on the staging repo (after pyyaml fix)

## Step 1: Claim the npm scope (5 min)

1. Open https://www.npmjs.com/org/create
2. Sign in (2FA)
3. Org name: `atelier`
4. Plan: Free (open-source unlimited)
5. Confirm

Verify: `npm view @atelier 2>&1` should return scope info, not 404.

## Step 2: Claim the GitHub org (5 min)

1. Open https://github.com/organizations/new
2. Sign in (2FA)
3. Org name: `atelier-oss`
4. Plan: Free
5. Owner email: alex@kohoconsulting.com (or your preferred address)

Verify: `gh api /orgs/atelier-oss --jq .login` should return `atelier-oss`.

## Step 3: Authenticate npm locally (2 min)

```bash
npm adduser
# follow the browser-based auth flow, complete 2FA in the browser
```

Verify: `npm whoami` should return your npm username.

## Step 4: Transfer the GitHub repo (3 min)

```bash
cd ~/Projects/atelier

# Transfer current private repo to atelier-oss
env -u GITHUB_TOKEN gh repo transfer 7alexhale5-rgb/atelier atelier-oss

# Update local remote
git remote set-url origin https://github.com/atelier-oss/atelier.git

# Make it public (the spec requires public visibility for upstream PR refs)
env -u GITHUB_TOKEN gh repo edit atelier-oss/atelier --visibility public --accept-visibility-change-consequences
```

## Step 5: Configure npm token in CI (3 min)

1. Generate a granular npm token scoped to `@atelier`:
   - Open https://www.npmjs.com/settings/{your-username}/tokens/granular-access-tokens/new
   - Name: `atelier-oss-ci`
   - Expiration: 1 year
   - Permissions: Read and write
   - Packages: `@atelier-oss/*` (scope-restricted)
   - Save the token (you'll only see it once)

2. Add to repo secrets:
   ```bash
   env -u GITHUB_TOKEN gh secret set NPM_TOKEN -R atelier-oss/atelier
   # paste the token when prompted
   ```

## Step 6: Trigger the release (1 min)

```bash
cd ~/Projects/atelier
# Bump-no-op commit to trigger workflow_run on a fresh push
git commit --allow-empty -m "release: trigger v0.1.0 publish"
git push
```

The release.yml workflow runs on workflow_run after CI passes, runs
`pnpm changeset:publish` with `NPM_CONFIG_PROVENANCE=true`. Watch:

```bash
env -u GITHUB_TOKEN gh run watch -R atelier-oss/atelier
```

Verify after publish:
- `npm view @atelier-oss/cli version` returns `0.1.0`
- Provenance attestation visible at https://www.npmjs.com/package/@atelier-oss/cli

## Step 7: Open the upstream PR (10 min)

```bash
# Fork google-labs-code/design.md to atelier-oss
env -u GITHUB_TOKEN gh repo fork google-labs-code/design.md --org atelier-oss --clone --remote
cd design.md
git checkout -b proposal/precedence-and-canonical-roles

# Apply the spec changes — see docs/upstream-pr-draft.md for the full text
# (the precedence rule + 8-role vocabulary, additive-only)

# Open as DRAFT until maintainers engage
env -u GITHUB_TOKEN gh pr create --draft --title "spec: precedence rule + canonical 8-role sub-token vocabulary" \
  --body-file ../atelier/docs/upstream-pr-draft.md
```

## Rollback (if anything goes wrong)

- Bad publish: `npm deprecate @atelier-oss/<pkg>@0.1.0 "reason"` and ship 0.1.1.
  npm unpublish window is 72 hours — after that, deprecation only.
- Repo move regret: `gh repo transfer atelier-oss/atelier 7alexhale5-rgb`
- npm token leak: `npm token revoke <token-id>` immediately, regenerate, update secret.

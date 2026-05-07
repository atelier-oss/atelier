# Changesets

Each PR that changes a package should include a changeset:

```bash
pnpm changeset
```

Pick the affected packages and a bump type (`patch` / `minor` / `major`), then commit the generated `.md` file.

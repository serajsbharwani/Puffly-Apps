# Versioning Guide

This project uses lightweight semantic versioning:

- `MAJOR.MINOR.PATCH` (example: `1.2.3`)
- `MAJOR`: breaking changes
- `MINOR`: new backward-compatible features
- `PATCH`: backward-compatible fixes

## Branch strategy

- `main`: stable branch for releases
- `feature/*`: short-lived branches for new features
- `fix/*`: short-lived branches for bug fixes

## Release workflow

1. Build and test changes on a feature/fix branch.
2. Merge into `main` after verification.
3. Create an annotated tag on `main`:
   - `vX.Y.Z` (for example `v1.1.0`)
4. Publish/update Netlify from `main`.

## Current baseline

- `v1.0.0`: initial stable public release of Little Puffly Checkers.

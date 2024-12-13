#!/bin/bash


CURRENT_VERSION="0.1.27"
NEW_VERSION="0.1.28"


# Create and push tag
git tag -a "$NEW_VERSION" -m "Release v$NEW_VERSION"
git push origin "$NEW_VERSION"

# Create release
gh release create "$NEW_VERSION" \
  --title "Frontwork dev-$NEW_VERSION" \
  --notes "Release notes for version $NEW_VERSION" \
  --target master
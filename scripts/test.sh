#!/bin/bash


$CURRENT_VERSION = "0.1.27"
$NEW_VERSION = "0.1.28"


$MY_GIT_REPO=$(git config --get remote.origin.url | sed 's/.*[\/:]\/\/github\.com\/\([a-zA-Z0-9_]+\/frontwork\)\.git/\1/')
gh pr create --repo frontwork-org/frontwork \
  --base master \
  --head $MY_GIT_REPO:master \
  --title "Merge changes for v$NEW_VERSION." \
  --body "Creating a pull request to merge changes for v$NEW_VERSION from $MY_GIT_REPO into frontwork-org/frontwork"
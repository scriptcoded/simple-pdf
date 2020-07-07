#!/usr/bin/env bash

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "develop" ]]; then
  echo 'Not on branch develop. Aborting.';
  exit 1;
fi

git merge master
git checkout master
git pull
git merge develop
npx dotenv release-it
git checkout develop
git merge master

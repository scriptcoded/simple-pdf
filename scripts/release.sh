#!/usr/bin/env bash

git merge master
git checkout master
git pull
git merge develop
npx dotenv release-it

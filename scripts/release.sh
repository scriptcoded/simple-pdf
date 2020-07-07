#!/usr/bin/env bash

git checkout master
git pull
git merge develop
npx dotenv release-it
git checkout master
git merge master

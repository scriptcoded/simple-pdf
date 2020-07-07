#!/usr/bin/env bash

git checkout master
git pull
git merge develop
npx dotenv release-it
#!/bin/bash
deno run --allow-run --allow-read --allow-write --allow-net --no-check --allow-env $1/scripts/build.ts $1

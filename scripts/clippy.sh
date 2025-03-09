#!/usr/bin/env bash
export LLAMA_CPP_SYS_NO_BUILD_INFO=1
cargo clippy --workspace --all-targets --all-features -- -D warnings -D clippy::unnecessary-literal-unwrap

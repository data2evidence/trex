#!/usr/bin/env bash
RUST_BACKTRACE=1 LLAMA_CPP_SYS_NO_BUILD_INFO=1 CARGO_NET_GIT_FETCH_WITH_CLI=true cargo clippy --workspace --all-targets --all-features -- -D warnings -D clippy::unnecessary-literal-unwrap

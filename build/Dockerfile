
FROM rust:1.77.2-bookworm as builder
ARG TARGETPLATFORM
ARG GIT_V_VERSION
ARG ONNXRUNTIME_VERSION=1.17.0
ARG PROFILE=release
ARG FEATURES

RUN apt-get update && apt-get install -y llvm-dev libclang-dev clang cmake
WORKDIR /usr/src/

RUN --mount=type=cache,target=/usr/local/cargo/registry,id=${TARGETPLATFORM} \
    cargo install cargo-strip

COPY . /usr/src/edge-runtime
WORKDIR /usr/src/edge-runtime

RUN --mount=type=cache,target=/usr/local/cargo/registry,id=${TARGETPLATFORM} --mount=type=cache,target=/usr/src/edge-runtime/target,id=${TARGETPLATFORM} \
    GIT_V_TAG=${GIT_V_VERSION} cargo build --profile ${PROFILE} --features "${FEATURES}" && \
    cargo strip && \
    mv /usr/src/edge-runtime/target/${PROFILE}/edge-runtime /root

FROM node:18.20.4-bookworm-slim AS development
RUN apt-get update && apt-get install -y libssl-dev && rm -rf /var/lib/apt/lists/*
RUN apt-get remove -y perl && apt-get autoremove -y

WORKDIR /usr/src
COPY --from=builder /root/edge-runtime /usr/src/trex
COPY core /usr/src/core
CMD mkdir /usr/src/plugin
COPY package.json.plugin /usr/src/plugin/package.json
COPY bunfig.toml /usr/src/plugin/bunfig.toml
COPY package.json /usr/src
COPY package-lock.json /usr/src

RUN npm ci 


CMD ["npm", "run", "start"]
EXPOSE 33000
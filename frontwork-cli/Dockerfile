# syntax=docker/dockerfile:1
# Pin the Deno base image version, override with:
#   docker buildx build --build-arg DENO_VERSION=x.y.z ...
ARG DENO_VERSION=2.9.7

# Multi-architecture image (linux/amd64, linux/arm64).
# Build with:
#   docker buildx build --platform linux/amd64,linux/arm64 -t frontwork .
# Each platform is built natively by buildx (under QEMU emulation on foreign
# architectures); the target platform is read from the automatic TARGETARCH
# build argument, so nothing architecture-specific is hardcoded.

# ---- Build stage: the frontwork CLI (Rust) ----
# rust:alpine ships official multi-arch manifests and produces fully static
# musl binaries.
FROM rust:alpine AS rust

# Install required dependencies with specific OpenSSL static libraries
RUN apk add --no-cache \
    musl-dev \
    openssl-libs-static \
    openssl-dev \
    pkgconfig \
    gcc

# Set OPENSSL_STATIC environment variable to force static linking
ENV OPENSSL_STATIC=1
ENV OPENSSL_LIB_DIR=/usr/lib
ENV OPENSSL_INCLUDE_DIR=/usr/include

WORKDIR /frontwork-cli
COPY . .

# Build a fully static musl binary for the platform being built.
# TARGETARCH (amd64/arm64) is provided automatically by buildx.
ARG TARGETARCH
RUN RUST_TARGET="$(case "${TARGETARCH}" in \
        amd64) echo x86_64-unknown-linux-musl ;; \
        arm64) echo aarch64-unknown-linux-musl ;; \
        *) echo "unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; \
      esac)" \
    && echo "building for ${RUST_TARGET}" \
    && cargo build --release --target "${RUST_TARGET}" \
    && cp "target/${RUST_TARGET}/release/frontwork" /usr/local/bin/frontwork


# ---- Runtime stage: Deno + frontwork CLI ----
# denoland/deno:alpine is multi-arch (linux/amd64, linux/arm64). Since Deno 2
# the image is Alpine with an isolated glibc runtime, tini as init and the
# `deno` user (uid 1000) pre-created.
FROM denoland/deno:alpine-${DENO_VERSION}

# The frontwork binary is fully static (musl + static OpenSSL),
# so it runs on the Alpine base without any additional runtime libraries.
COPY --from=rust /usr/local/bin/frontwork /usr/local/bin/frontwork

# Test if deno and frontwork is installed (also validates the binary
# architecture of every platform this image is built for)
RUN deno --version && frontwork --version

# tini (shipped with the Deno image) as PID 1 for correct signal handling
# of the deno child processes spawned by the frontwork CLI.
ENTRYPOINT ["/tini", "--", "frontwork"]
# Override the base image's default CMD (a leftover deno eval from the
# upstream image) with the frontwork help text.
CMD ["--help"]

# New Makefile for multi-architecture
# WARNING:
# This makefile used docker buildx to build multi-arch image
# Please make sure you have the right version of docker.
.PHONY: all

## This Makefile should be used with zadig workflow to inject multiple build parameters.

IMAGE_REPOSITORY = koderover.tencentcloudcr.com/koderover-public
VERSION ?= $(shell date +'%Y%m%d%H%M%S')
VERSION := $(VERSION)

prereq:
	@docker buildx create --node=multiarch-frontend --use --platform=linux/amd64,linux/arm64

all: prereq
all:
	@if [ -f "config/prod.env.js" ]; then \
	sed -i 's/${VERSION}/'"$VERSION"'/g' config/prod.env.js \
	sed -i 's/${BUILD_TIME}/'"$BUILD_TIME"'/g' config/prod.env.js \
	sed -i 's/${COMMIT_ID}/'"$zadig_portal_COMMIT_ID"'/g' config/prod.env.js \
	sed -i 's/${BRANCH}/'"$zadig_portal_BRANCH"'/g' config/prod.env.js \
	sed -i 's/${PR}/'"$zadig_portal_PR"'/g' config/prod.env.js \
	sed -i 's/${TAG}/'"$zadig_portal_TAG"'/g' config/prod.env.js \
	cat config/prod.env.js \
	fi
all:
	@yarn install --modules-folder=/workspace/nodecache
	@yarn run build
	@docker buildx build -t ${IMAGE_REPOSITORY}/zadig-portal:${VERSION} --platform linux/amd64,linux/arm64 -f Dockerfile --build-arg BRANCH=$zadig_portal_BRANCH --build-arg PR=$zadig_portal_PR --build-arg TAG=$zadig_portal_TAG --build-arg COMMIT_ID=$zadig_portal_COMMIT_ID --build-arg BUILD_TIME=$(date +%s) --build-arg BUILD_URL=$BUILD_URL --push .

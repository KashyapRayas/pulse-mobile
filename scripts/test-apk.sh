#!/usr/bin/env bash
# Test APKs for the /feature workflow (.claude/skills/feature/SKILL.md): build the fork variant of the working tree,
# share it as a GitHub pre-release on the fork, and remove a branch's test builds once it merges.
#
#   scripts/test-apk.sh build                 Builds the fork variant (in.portlabs.pulse.fork, arm64) and prints its path.
#   scripts/test-apk.sh publish <apk> [notes] Uploads it as a pre-release on the fork and prints the download link.
#   scripts/test-apk.sh clean [branch]        Deletes the branch's test pre-releases and their tags.
#
# The fork variant installs beside the original Pulse Mobile (app.config.js), so a test build never touches the
# original's data. It is signed with the debug key `expo prebuild` writes, the same file on every prebuild, so each test
# build installs over the last one and keeps its data. It carries no Sentry DSN (that lives in eas.json's profiles),
# so it sends no error reports. Pre-releases are never "latest": the app's update check never offers them.
#
# Needs the Android SDK and JDK 21 (defaults below; override with ANDROID_HOME and JAVA_HOME), and gh signed in to an
# account that can write to the fork. Gradle and gh reach the network and write outside the repository, so run it
# outside Claude Code's sandbox.
set -euo pipefail

REPO=${PULSE_FORK_REPO:-KashyapRayas/pulse-mobile}
ROOT=$(git rev-parse --show-toplevel)
OUT=${PULSE_TEST_APK_DIR:-$ROOT/.claude/test-apks}
branch=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)
slug=$(printf '%s' "$branch" | tr -c 'A-Za-z0-9._-' '-' | sed 's/-*$//')
short=$(git -C "$ROOT" rev-parse --short=7 HEAD)

die() { echo "test-apk: $*" >&2; exit 1; }

pick_dir() { for d in "$@"; do [ -d "$d" ] && { echo "$d"; return; }; done; }

build() {
  export ANDROID_HOME=${ANDROID_HOME:-$(pick_dir /opt/homebrew/share/android-commandlinetools "$HOME/Library/Android/sdk")}
  export JAVA_HOME=${JAVA_HOME:-$(pick_dir /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home)}
  [ -n "$ANDROID_HOME" ] || die "no Android SDK found: set ANDROID_HOME"
  [ -n "$JAVA_HOME" ] || die "no JDK 21 found: set JAVA_HOME"
  [ -x "$ROOT/node_modules/.bin/expo" ] || die "node_modules is missing: run pnpm install --frozen-lockfile"
  [ -z "$(git -C "$ROOT" status --porcelain --untracked-files=no)" ] || echo "test-apk: building uncommitted changes as well" >&2

  cd "$ROOT"
  # android/ is generated and git-ignored (AGENTS.md: no native edits): prebuild writes it fresh for the fork package.
  APP_VARIANT=fork "$ROOT/node_modules/.bin/expo" prebuild --platform android --clean --no-install >&2
  # One architecture and compressed native libraries, as eas.json's preview profile, keep the APK near 29 MB.
  (cd android && ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a -Pexpo.useLegacyPackaging=true --console=plain >&2)

  mkdir -p "$OUT"
  local apk="$OUT/pulse-fork-$slug-$short.apk"
  cp android/app/build/outputs/apk/release/app-release.apk "$apk"
  local signer
  signer=$(ls -d "$ANDROID_HOME"/build-tools/*/ 2>/dev/null | sort -V | tail -1)apksigner
  if [ -x "$signer" ]; then "$signer" verify --print-certs "$apk" 2>/dev/null | grep -m1 'SHA-256' >&2 || true; fi
  echo "$apk"
}

publish() {
  local apk=${1:?usage: scripts/test-apk.sh publish <apk> [notes-file]}
  local notes=${2:-}
  [ -f "$apk" ] || die "no such APK: $apk"
  local sha tag body
  sha=$(git -C "$ROOT" rev-parse HEAD)
  tag="test-$slug-$short"
  body=$(mktemp)
  {
    echo "Test build of \`$branch\` at \`$sha\`. Not a release: install it to try the change, then reply in the Claude Code session."
    echo
    echo "It installs as a second Pulse (in.portlabs.pulse.fork), beside the original, and over earlier test builds."
    if [ -n "$notes" ] && [ -f "$notes" ]; then echo; cat "$notes"; fi
  } > "$body"
  # The tag points at the fork's default branch: the commit under test is not pushed until the build is approved, and a
  # release cannot tag a commit GitHub does not have. The notes name the real commit.
  gh release create "$tag" "$apk" --repo "$REPO" --prerelease --latest=false \
    --title "Test build: $branch ($short)" --notes-file "$body" >/dev/null
  rm -f "$body"
  gh release view "$tag" --repo "$REPO" --json assets --jq '.assets[0].url'
}

clean() {
  local b=${1:-$branch}
  local s
  s=$(printf '%s' "$b" | tr -c 'A-Za-z0-9._-' '-' | sed 's/-*$//')
  gh release list --repo "$REPO" --limit 200 --json tagName,isPrerelease \
    --jq ".[] | select(.isPrerelease and (.tagName | startswith(\"test-$s-\"))) | .tagName" |
    while read -r tag; do
      gh release delete "$tag" --repo "$REPO" --yes --cleanup-tag && echo "deleted $tag"
    done
  rm -f "$OUT"/pulse-fork-"$s"-*.apk
}

case ${1:-} in
  build) build ;;
  publish) shift; publish "$@" ;;
  clean) shift; clean "$@" ;;
  *) sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac

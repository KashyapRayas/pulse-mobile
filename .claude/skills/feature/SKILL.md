---
name: feature
description: Take a Pulse Mobile feature request from idea to merge on the owner's fork - research, build in a worktree, share a test APK to the phone, wait for the owner's approval, then push, open a PR, review it against docs/review-standard.md in a fix loop, and merge into KashyapRayas/pulse-mobile main. Use when the user types /feature or asks to run the feature workflow for a request.
argument-hint: <feature request in plain words>
---

# /feature: request to merge, with one human step

The owner's only job is testing the APK on their phone. Everything else runs here, in order, without asking, except
where a stage below says **stop**. Follow `AGENTS.md` throughout; `docs/review-standard.md` is the bar for merging.

The request is: **$ARGUMENTS**

If that is empty, ask for the request in one line and stop.

## Fixed facts

- Fork: `KashyapRayas/pulse-mobile` (remote `origin`). Every `gh` call passes `--repo KashyapRayas/pulse-mobile`.
  Nothing goes to the upstream `adityaongit/pulse-mobile`: no push, no PR, no release.
- Commits: `KashyapRayas <kashyap.rayas@gmail.com>` (check `git config user.email`), conventional messages, `git commit -s`,
  ending with the attribution line the session gives. Never force-push.
- Sandbox: `gh`, `git push`, `git worktree`, Gradle and `pnpm install` need the network or write outside the repository.
  Run them with the sandbox off; the owner approves each prompt.
- Checks run the binaries directly (pnpm verifies itself over the network first):
  `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/eslint .`, `./node_modules/.bin/vitest run`, and the bundle
  check `EXPO_OFFLINE=1 CI=1 ./node_modules/.bin/expo export --platform android --output-dir "$TMPDIR/pulse-bundle-check"`
  (delete the folder after).

Keep the app's task list current (one step per stage below) and say in a line which stage you are on as each starts.

## 1. Set up

1. Pick a short kebab-case name from the request (`sleep-alarm`, `route-maps`). The branch is `feat/<name>`.
2. Work in a worktree, never in the main checkout (other sessions use it). If this session is not already in one under
   `.claude/worktrees/`, use the EnterWorktree tool for `feat/<name>`; without it, run
   `git fetch origin && git worktree add .claude/worktrees/<name> -b feat/<name> origin/main` and work from there.
3. `node_modules`: when `package.json` and `pnpm-lock.yaml` match the main checkout's, link the main checkout's
   (`ln -s <main checkout>/node_modules node_modules`; `/node_modules` is in `.git/info/exclude`). Otherwise run
   `pnpm install --frozen-lockfile`.

## 2. Research

1. Read what the request touches: `AGENTS.md`, the code and its tests, the relevant docs in `docs/`, halo or the
   reference study where `AGENTS.md` says they are the reference, and the Expo SDK 57 docs for any Expo API (never from
   memory).
2. Write the plan to `docs/features/<name>.md`: what the owner will see, the files to change, data and scoring effects
   (`SCORING_VERSION` / `IMPORT_VERSION` bumps), what stays out, and the phone checks. Mermaid for any flow.
3. **Stop and ask** (one question, with your recommendation first) only when a choice changes what gets built: a rule
   in `AGENTS.md` that the request would bend (a new Health Connect write type, a network call, a Store interface
   change), or two real designs with different results for the owner. Otherwise go on.

## 3. Build

1. Implement the plan in small commits on `feat/<name>`. Tests go beside the code (`docs/review-standard.md` § Tests).
2. Run all four checks. Fix and repeat until every one passes. Lint warnings already on `main` don't count.
3. Review your own diff once against `docs/review-standard.md` before building the APK; fix what it finds.

## 4. Test APK (the owner's step)

1. Write the phone checks to `$TMPDIR/test-notes-<name>.md`: a numbered list of what to try, each with what should
   happen. Plain words, no file paths.
2. Build and share it, with the sandbox off:
   ```sh
   apk=$(scripts/test-apk.sh build)
   scripts/test-apk.sh publish "$apk" "$TMPDIR/test-notes-<name>.md"
   ```
   The build takes several minutes; run it in the background and wait for it to finish. `publish` prints the download
   link.
3. Tell the owner, with the PushNotification tool when it is available (so it reaches the phone), and in your message:
   the download link, that it installs as a second Pulse beside the original, and the phone checks.
4. **Stop.** End the turn and wait for the owner's reply. Do not push or open a PR before it.
5. On the reply:
   - Approval ("approved", "looks good", "ship it"): go to stage 5.
   - Anything else is a change request: make it (stage 3), then build and share a new APK (this stage again).

## 5. Push and open the PR

1. `git push -u origin feat/<name>`.
2. Open the PR against the fork's main:
   `gh pr create --repo KashyapRayas/pulse-mobile --base main --head feat/<name> --title "<conventional title>" --body-file <file>`.
   The body: what changed for the owner, the commits, the checks that passed, and "Tested on the phone by the owner"
   with the phone checks. End it with the attribution line the session gives.
3. Bind the PR to the session (ccd_pr `get_status`, then `bind_pr` if it is not bound).

## 6. Review loop

Up to **3 rounds**:

1. Run the `code-review` skill at `high` on the PR number. When GitHub refuses the PR's diff (over 300 files), it
   reviews the checked-out branch, which is the PR's head; that is expected.
2. Check the diff against every rule in `docs/review-standard.md` as well, and add any broken rule as a finding at the
   severity the standard gives it.
3. No `important` finding and all checks green: go to stage 7.
4. Otherwise fix every `important` finding and the cheap `nit`s, rerun the checks, commit, push, re-report the findings
   with their outcomes, and start the next round.

When the loop is clean, look at what the fixes changed since the approved APK. Fixes that change what the app does
(not only tests, comments, docs or types) need the owner's eyes again: build and share a new APK with just the affected
checks (stage 4, steps 1 to 4) and wait for approval before merging. Fixes that change nothing on screen merge as they
are.

After round 3 with an `important` finding left: **stop**. Tell the owner what is left, with the PR link, and wait.

## 7. Merge

1. Confirm the PR is still open, its base is `main` on `KashyapRayas/pulse-mobile`, and the head is the commit that
   passed review.
2. `gh pr merge <number> --repo KashyapRayas/pulse-mobile --squash --delete-branch`, then
   `gh pr view <number> --repo KashyapRayas/pulse-mobile --json state,mergeCommit` to confirm it merged.
3. Clean up: `scripts/test-apk.sh clean feat/<name>` (removes the test pre-releases), leave the worktree
   (ExitWorktree, or `git worktree remove` from the main checkout), and `git fetch origin` so `origin/main` has the merge.
4. Report in a few lines: what merged (PR link, merge commit), what the owner tested, and anything noted but not fixed
   (`pre_existing` findings).

## Never

- Merge without the owner's approval of a test APK that shows what the PR does, or with an `important` finding open.
- Push, open a PR, release or merge anywhere but `KashyapRayas/pulse-mobile`.
- Edit `android/` by hand, force-push, or skip a failing check.
- Load sample data into the owner's real install, or uninstall either app on the phone.

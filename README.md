# Gurukul

An offline study companion: bring your notes, understand a topic, practice, and revisit what you missed.

## T7 UX and resilience — manual accessibility pending

Settings → Storage offers measured free space, confirmed source/notebook deletion and retryable private-file cleanup. Model removal is separate and affects only tracked installation files; older copies stay. Database removal explains affected conversations/quizzes/attempts and never runs without confirmation. Host deletion checks use synthetic fixtures, not your files.

Teacher/readiness states reuse the local book character. Notebooks retain phone tabs and add a right-hand discussion panel on wide, regular-text layouts; large text stacks panels and import sheets honor reduced motion. Migration 7 is installed on the iPhone with prior study data preserved.

Focused iPhone checks passed: real local generation without canary/prompt dumps in process logs, interrupted-job recovery, synthetic deletion/cleanup retry across relaunches, keyboard creation, named confirmation/Cancel and large-text home accessibility audit. Prior user data is preserved. **Manual VoiceOver/Reduce Motion acceptance remains pending**; this is not an all-screen accessibility or whole-device privacy audit. Android runtime and wide native layouts remain unverified. See [current T7 evidence](docs/engineering/state.md#current-t7-result) and [UX states](docs/UX/07-resilience-states.md). T8 is not started.

`npm install` applies the version-guarded llama.rn 0.9.1 privacy patch automatically. For an existing install, run `npm run native:privacy`, then `cd ios && pod install --no-repo-update` before rebuilding; an old native binary is not fixed by Metro/OTA. Both platforms now build the patched core from source, with Android OpenCL/Hexagon targets excluded consistently with the CPU-only app configuration. No dependency/version upgrade is involved. The native build variant is `gurukul-private-log-v1`; model GGUF revision/hash, prompts and inference parameters remain unchanged. The patch disables engine logs rather than redirecting sensitive logs elsewhere; fixed application error messages remain available.

Focused iPhone UI checks: run `ruby scripts/ios-t7-tests.rb`, then build/test the generated `GurukulT0` scheme for the connected phone. The test suite creates/deletes only its own uniquely named disposable notebook. Keep the phone unlocked/foreground and do not switch apps during these checks. VoiceOver and Reduce Motion still need hands-on verification; automated accessibility audit is not a substitute for all assistive-technology behavior.

## T6 progress and revision

Open **Progress** for dated attempts, original scores and adjusted correct/scorable counts. Topic summaries use the latest 10 valid responses per notebook/source section: fewer than 3 shows Limited evidence; at least 3 with accuracy strictly below 70% shows Priority review. Wrong/skipped answers link to their saved supporting material. Repeated questions are explicitly identified, not presented as independent mastery evidence.

Expand an attempt to flag ambiguous responses out of derived progress without rewriting its original score. **Review this topic → Practise saved quiz again** copies the validated saved questions into a new editable attempt, retaining the old source revision and known exclusions. This requires no model and is labeled repeat practice, not newly generated output. In-progress attempts can resume from history. History currently shows the latest 100 attempts; topic summaries use all retained history to select their 10-response windows. [Progress UX](docs/UX/06-progress-states.md); native interaction/accessibility acceptance remains separate from host checks.

## T5 quizzes

Notebook → Study or History → **Quiz · practice and saved attempts**. Choose 3 (default) or 5 questions from selected reviewed sources, generate locally, edit saved selections and explicitly submit at the end. Only a complete validated snapshot can start. Scoring is deterministic and repeat submission returns the same result. Flag ambiguous questions before submission to exclude them; zero scorable questions produce no score. Results retain wrong/skipped answers, explanations and saved source excerpts. Generation may fail safely if the small model cannot produce a valid set; no curated questions replace it. See [quiz UX](docs/UX/05-quiz-states.md) and state.md for actual phone/quality evidence.

Current quizzes are constrained, model-generated **source-sentence completion MCQs**: choose the missing word from four options. Decoding permits only single-gap variants of the selected source sentences; the model chooses a variant and generates options and a key, which must reconstruct the cited sentence. No invalid output is filled in by code. Unsupported free-form conceptual questions are not claimed. The selected teacher is now Qwen2.5-1.5B-Instruct Q4_K_M after the smaller model failed this gate; [bounded phone comparison](docs/quality/reports/t5-quiz-feasibility.md).

The separate T0 diagnostics retain their historical Qwen3 feasibility manifest and file; they are not the notebook study/quiz path or a fallback for the selected teacher.

## T4 study actions

Open a notebook's **Study** tab after selecting reviewed sources. Ask my notes and Explain topic use local lexical retrieval; Summarize selected section requires explicitly choosing an excerpt. Answers appear only after validating their source IDs and exact quotes. Tap View source to inspect the saved page/revision excerpt. History stays with the notebook; cancelled/interrupted/invalid turns are not completed answers. Questions are independent in this slice: repeat the topic in follow-ups. A verified local teacher is required; no evidence means no model-memory/cloud fallback. See [study UX states](docs/UX/04-study-states.md) and [AI implementation](docs/architecture/ai.md#t4-implemented-lexical-path).

Current teacher mode is **source-exact/extractive**: it selects relevant wording from the notes for all three actions. Free-form explanatory quality did not pass the initial phone check; unsupported additions are rejected rather than displayed. Exact quotations still require checking relevance and source accuracy.

## T3 source library

Home → notebook → Add notes accepts paste/TXT, PDF, JPEG/PNG and camera capture in the native build. Review/edit every extracted page before Save makes it searchable. Camera denial leaves file/paste available. Only short clean English printed notes are supported; no Bengali OCR or arbitrary handwriting claim. Expo Go cannot run these native import adapters.

Imports retain private originals, SHA-based duplicate detection, page provenance, recoverable jobs and immutable edited revisions. Limits, retry behavior, dependencies and platform differences: [T3 import contract](docs/engineering/t3-imports.md). Actual device evidence and pending picker/camera gates: [state](docs/engineering/state.md). Home/library/import/review follow the supplied UX palette, cards and artwork; Study/quiz/progress remain later tickets.

## T1 foundation

- Welcome → local nickname (or skip to Student) and preferred language → Notebooks / Study / Progress / Settings. No account, contact details or network request in this flow.
- SQLite `gurukul.db` stores one profile and a labeled synthetic notebook. Settings edits persist; unsupported/future schema or storage failure shows a retry/error state, never deletes or resets data.
- Study/progress features are explicitly unfinished. Language selection stores a preference, not a promise of translated UI or Hindi/Bengali OCR. Settings retains the real T0 native diagnostics; Expo Go disables those actions.
- Shared iOS/Android source uses typed local routes rather than a deep-link router. Physical iPhone verification does not establish Android runtime behavior.

Use the pinned Node version in `.nvmrc` (this Mac: `export PATH="$PWD/.local/toolchain/node_modules/.bin:$PATH"`), then:

```sh
npm run typecheck
npm run lint
npm test
```

Tests use Node's real SQLite engine and cover initialization/idempotency, reopen persistence, Unicode/SQL-like input, rollback, future schema rejection, singleton constraints and routes. Temporary databases are uniquely named under the OS temp directory and retained, not automatically deleted. Node 22 prints experimental SQLite/module-detection warnings. Native adapter behavior is additionally checked on the iPhone; host tests alone do not prove it.

T1 adds exact `expo-sqlite@57.0.3` and `react-native-safe-area-context@5.7.0` (MIT). Native development clients require a rebuild/Pods update; Expo Go SDK 57 includes these modules for foundation work. Tooling pins: TypeScript 6.0.3 (Apache-2.0), @types/react 19.2.4, ESLint 10.12.0 and typescript-eslint 8.71.1 (MIT). Expo compatibility check passes. No API keys or remote database are used. T0 model files and evidence remain separate from the new SQLite database.

**Current state:** T0–T2 are complete within their bounded iPhone scope. Real phone download cancellation/restart, full checksum/promotion, newly downloaded model load/local answer/unload and data-preserving upgrade passed. Imports/RAG/quizzes are not implemented. Expo Go supports foundation work, not native AI/OCR. Android-device and full release gates remain separate. See [T2 evidence and limits](docs/plans/v1-build.md#t2-model-lifecycle-result--2026-10-06).

## T2 teacher installation

In the rebuilt native app, open **Settings → Teacher**. The app checks for the current pinned Qwen2.5-1.5B-Instruct artifact locally, verifies full size/SHA-256, and explicitly labels preinstalled adoption; it never calls this a completed download. Choose **Load teacher locally**, **Run synthetic local answer**, then **Unload teacher**. The answer is a synthetic feasibility check, not retrieval from your notebooks. Unload before T0 diagnostics; a shared native lease prevents competing AI/OCR work. The historical Qwen3 T0 manifest is preserved in `src/t0/feasibility-model.json`; its old files and installation row are not deleted or silently used as fallback.

**Download / retry teacher** (or **Download a fresh copy**) requires confirmation and shows the exact 1,117,320,736-byte artifact, license, revision, checksum, runtime and actual byte progress. It requires 3,308,383,296 free bytes for two artifact copies plus a 1 GiB reserve. Only the bundled, immutable HTTPS artifact URL is used; no study content enters the downloader. New attempts use unique staging names; size and streaming native SHA-256 verification precede same-directory promotion. Existing models are never overwritten or removed. A corrupt prior model can be recovered with a fresh, uniquely named copy.

Retries deliberately restart from zero, with notice: cross-platform range/ETag resume is **not enabled**. Cancel requests native pause; iOS owns temporary download storage, while Android can retain the destination partial. Retention of OS temporary files is not guaranteed. SQLite checkpoints the attempt, last observed byte count on handled interruption, and partial identity; abrupt termination may retain an earlier byte count. Reopen does not automatically download or load a partial. If promotion completed before a metadata write failed, recovery checks the deterministic destination and re-verifies it. Retained files have no cleanup UI yet; do not clear app data to free model space because that loses notes/profile.

Generation is serialized; foreground loss cancels work and unloads the context. The screen stays awake during downloads to avoid Auto-Lock interruption; this is restored on exit, and manually leaving the app still cancels. Verification/native initialization are not force-killed: cancellation waits for them to finish before release. Storage, integrity, native-load and interruption errors are visible without raw native exceptions or database resets. Model lifecycle does not modify notebooks/profile. Download/load state is persistent; runtime-loaded state is process-local and never trusted after restart.

New exact dependency: **expo-file-system 57.0.7 (MIT)**, matching the SDK 57 bundled matrix. Uses the [documented native download-task API](https://docs.expo.dev/versions/latest/sdk/filesystem/) with a foreground session, not legacy resume or arbitrary fetch URLs. Run Pods/rebuild native clients after installing; a Metro refresh cannot add native APIs. Focused host coverage now includes 9 SQLite/foundation tests and 11 model/lifecycle tests. The opt-in T2 phone smoke component requires the existing Debug/`T0_OFFLINE_SMOKE` native compilation gate plus `--gurukul-t2-smoke`; adding `--gurukul-t2-download` performs a real cancel/retry transfer and must be explicitly authorized because it uses phone data. Ordinary launches never run these checks.

## Test the Android development app

APK: `android/app/build/outputs/apk/debug/app-debug.apk` (127,597,995 bytes, about 122 MiB). Package `org.gurukul.t0`, ARM64 only, minimum Android API 24. This is the **Gurukul T0 development app**, not Expo Go or the full study interface. Phone compatibility is not established by compilation alone.

1. Connect the phone by USB, enable Developer options → USB debugging, and approve the computer on the phone. `adb devices -l` must show an authorized device. Confirm its ABI includes `arm64-v8a` with `adb shell getprop ro.product.cpu.abilist`.
2. Install with `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`. If signing differs from an existing installation, stop rather than uninstalling or clearing user data.
3. Stage the model and synthetic fixtures into this app's private storage using the three `adb shell -T` commands in the [T0 recipe](docs/plans/v1-build.md#resume-t0-only). The verified model is separate from the APK. Fixture staging is a temporary T0 shortcut, not a completed download/import feature.
4. In your separate terminal, from the project directory:

```sh
export PATH="$PWD/.local/toolchain/node_modules/.bin:$PATH"
adb reverse tcp:8081 tcp:8081
npm run start:dev -- --port 8081
```

Open **Gurukul T0**, then use its development launcher/terminal QR to load the project. Stop any existing Metro server on that port first in its owning terminal. Do not open Expo Go for the native checks. Run the answer, printed-image OCR and PDF OCR buttons and retain the actual results. Record phone model/OS/RAM/free storage and the displayed timings/memory. Metro-based testing does not establish standalone offline operation.

To rebuild on this Mac, after any needed Android prebuild:

```sh
export PATH="$PWD/.local/toolchain/node_modules/.bin:$PATH"
export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home
export ANDROID_HOME="$HOME/Library/Android/sdk"
NODE_ENV=development EXPO_NO_TELEMETRY=1 ./android/gradlew -p android :app:assembleDebug --no-daemon --max-workers=2 -PreactNativeArchitectures=arm64-v8a
```

Generated Android files remain ignored; SDK 54 output was preserved in `.local/android-sdk54-backup`. The new project was generated with `npm run prebuild -- --platform android` using SDK 57. Native build log: `.local/android-tools/build-sdk57.log`.

## Run on your iPhone with Expo Go

Use Node 22.23.3 (`.nvmrc`) and the SDK 57-compatible Expo Go already installed on your phone. The Mac's original Node 22.12.0 is too old for the new React Native toolchain. This workspace has a project-local runtime, so no global Node change is needed:

```sh
export PATH="$PWD/.local/toolchain/node_modules/.bin:$PATH"
npm start
```

Run from the project directory. Connect the Mac and iPhone to the same Wi-Fi, allow Expo Go local-network access, and scan the terminal QR code using the iPhone Camera. If Expo Go requests sign-in, use the same Expo account as the CLI; this is development tooling, not a Gurukul account requirement. Only use synthetic content during this development preview.

On another checkout, install/use Node from `.nvmrc`, run `npm ci`, then `npm start`. The ignored `.local/toolchain` runtime is not included in Git. `npm start` explicitly selects Expo Go; `npm run start:dev` selects a custom development build.

Expo Go does not run llama.rn or the custom document reader. Native code is loaded only from the development-build path; no cloud/laptop inference fallback exists. iOS development builds need full Xcode and CocoaPods; physical iPhones also need signing. Android development builds need the Android SDK/JDK. Both require real-device checks before a phone compatibility claim. `npm run prebuild -- --platform ios` uses `--no-clean` to avoid silently deleting generated directories.

## Run the iOS development app

On this Mac the iPhone 16 simulator (`24ADBC7A-2B97-4F8F-AFFF-31AABE92E49D`, iOS 18.1) already has the development app and verified synthetic fixtures/model installed. Keep Metro running in your terminal. Open the installed app without rerunning the smoke test:

```sh
xcrun simctl launch 24ADBC7A-2B97-4F8F-AFFF-31AABE92E49D org.gurukul.t0 \
  --initialUrl 'http://localhost:8081?disableOnboarding=1&disableAutoLaunch=1'
```

Use the three native buttons. Simulator.app was absent at the usual Xcode location on this host; `simctl` launch/screenshots worked headlessly. A simulator screenshot and integrated JSON are retained under `.local/t0`. This is not an Expo Go session.

For rebuilding (check available disk first):

```sh
export PATH="$PWD/.local/toolchain/node_modules/.bin:$PATH"
npm run prebuild -- --platform ios
(cd ios && NODE_ENV=development pod install)
NODE_ENV=development EXPO_NO_TELEMETRY=1 xcodebuild \
  -workspace ios/GurukulT0.xcworkspace -scheme GurukulT0 -configuration Debug \
  -sdk iphonesimulator -destination 'id=24ADBC7A-2B97-4F8F-AFFF-31AABE92E49D' \
  -derivedDataPath .local/t0/ios-build -jobs 2 CODE_SIGNING_ALLOWED=NO \
  ONLY_ACTIVE_ARCH=YES DEBUG_INFORMATION_FORMAT=dwarf build
```

Install the resulting `.local/t0/ios-build/Build/Products/Debug-iphonesimulator/GurukulT0.app` with `xcrun simctl install`. Stage the verified GGUF, `printed.png` and `printed.pdf` in its private `Documents` directory from `xcrun simctl get_app_container <device-id> org.gurukul.t0 data`; do not overwrite existing files. Build output and Pods are ignored, not published.

For an explicit integrated smoke run, terminate the app then add `--gurukul-t0-smoke` to the launch command. Debug iOS builds expose this opt-in switch on simulator and physical devices; the report distinguishes them and records OS/RAM/storage. It runs the same inference/OCR functions as the buttons, asserts the OCR sentence, records failures independently, and writes a uniquely named `t0-smoke-*.json` in app Documents. Restart without the flag afterward. Model initialization uses CPU, context 2048 and two threads. Rebuild older development clients for the updated smoke bridge.

The focused offline verification uses the signed physical build recipe with `-configuration Release`, `NODE_ENV=production` and `'SWIFT_ACTIVE_COMPILATION_CONDITIONS=$(inherited) T0_OFFLINE_SMOKE'`. This explicit test-only condition enables the same smoke interface in that Release build; ordinary Release builds omit it. Verify `main.jsbundle` exists, install without uninstalling, then cold-launch with `--gurukul-t0-smoke` but **no `--initialUrl`**, after disabling phone Wi-Fi/cellular/Bluetooth. The report includes embedded-bundle presence and JS development mode. This check passed on 2026-10-06 with user-confirmed wireless-off settings; no packet audit was performed. The standalone app is installed: open Gurukul T0 directly without Metro. The normal launch uses no smoke flag and does not automatically run inference.

The iOS 27 physical build enables scene lifecycle through `expo-build-properties@57.0.22`. With the phone's signing team configured, use the same build recipe with `-sdk iphoneos`, the actual phone destination, no `CODE_SIGNING_ALLOWED=NO`, and `-allowProvisioningUpdates ENABLE_USER_SCRIPT_SANDBOXING=NO`. The latter is a build-scoped workaround for React Native's Metro `ip.txt` script write. Approve development-key access locally if macOS prompts; never put passwords in commands or chat. Physical signing/install/runtime checks passed on the user's iPhone 16 Pro. The app/model/fixtures are installed; open Gurukul T0, not Expo Go, and connect to the user-managed Metro server. If necessary, trust the developer under iPhone Settings → General → VPN & Device Management. Physical CLI launch uses `xcrun devicectl device process launch --device <phone-id> org.gurukul.t0 --initialUrl 'http://<mac-lan-ip>:8081?disableOnboarding=1&disableAutoLaunch=1'`; append the explicit smoke flag only when testing, not for normal use.

### Focused iOS Simulator OCR check

This compiles the actual OCR core, not the Expo application. With an installed simulator runtime, boot a selected simulator first. Existing synthetic fixtures must be present in `.local/t0`.

```sh
xcrun swiftc -target arm64-apple-ios16.4-simulator \
  -sdk "$(xcrun --sdk iphonesimulator --show-sdk-path)" \
  modules/document-reader/ios/LocalDocuments.swift scripts/t0-ios-ocr-smoke.swift \
  -o .local/t0/ios-ocr-smoke
xcrun simctl spawn booted "$PWD/.local/t0/ios-ocr-smoke" "$PWD/.local/t0"
```

The check asserts the exact synthetic sentence for image and scanned-PDF OCR, reports elapsed time/resident memory, and preserves uniquely named fixture copies in simulator Documents. It does not test llama.rn, JavaScript bridging, phone performance or standalone offline operation. For the eventual development app, stage the model/fixtures in its own `Documents` directory obtained through `xcrun simctl get_app_container <device-id> org.gurukul.t0 data`.

## Start here

1. [V1 product specification](docs/product/v1-spec.md) — experience, scope, acceptance criteria.
2. [Research synthesis](docs/research/synthesis.md) — findings, corrections, primary sources.
3. [System architecture](docs/architecture/system.md) — platform, ingestion, local inference.
4. [AI and evaluation](docs/architecture/ai.md) and [data model](docs/architecture/data.md).
5. [Implementation plan](docs/plans/v1-build.md) — tomorrow's demo and full V1.
6. [Agent operating guide](docs/engineering/agent-workflow.md) — how to work with Codex.
7. [Current handoff](docs/engineering/state.md) — next task and unverified assumptions.
8. [Copy-ready T0–T9 prompts](docs/plans/agent-prompts.md) — instructions to give your implementation agent.

## Recommendation

One shared React Native/Expo app for iOS and Android. Simulator and iPhone 16 Pro T0 integration passed; broader device and standalone offline checks remain pending. Native development builds use llama.rn, one quantized local model and platform document adapters; SQLite and local retrieval remain planned. Printed English is the initial test scope; Hindi/Bengali features need separate evidence.

Use a local nickname; optional phone/email is profile information, not authentication. Initial installation/model download needs connectivity; study must work offline afterward. “No inference API fee” does not mean downloads, hosting, development, and support have no cost.

## Harness check

Run from this directory with Python 3:

```sh
python3 scripts/check_harness.py
```

This checks document links, required artifacts, skill metadata, and preservation of the supplied research. It does not validate a mobile app. Run it only when harness structure changes or validation is requested. `npm run typecheck` checks the T0 source; native verification remains pending as recorded in the build plan.

## Preserved inputs

[Original research](docs/my-research/) and [SWE operating-system notes](docs/SWE_os.md) are unchanged. Their historical proposals are evidence to evaluate, not the current specification.

# 🧠 Knowledge Hub OS - Infrastructure & Architecture Documentation

## 📌 Project Overview
Knowledge Hub OS is a cloud-native, polyglot microservice system designed for productivity intelligence. It utilizes an event-driven architecture, separating the core business logic (TypeScript/NestJS) from the AI processing engine (Python/FastAPI), connected via a Kafka event backbone.

This repository is managed as a strict, hermetic monorepo using Bazel (Bzlmod).

## 🏗️ Architectural Foundations

| Layer                  | Technology                          | Version / Notes                          |
|------------------------|-------------------------------------|------------------------------------------|
| Build system           | Bazel                               | 7.3.1 (Bzlmod)                           |
| API Gateway            | NestJS                              | Node.js 18.17.1, TypeScript 5.2.2        |
| AI Service             | FastAPI                             | Python 3.11, Pydantic                    |
| Event Backbone         | Redpanda                            | Kafka protocol compatible                |
| Package Manager (Node) | pnpm                                | workspace + strict root protection       |
| Package Manager (Py)   | pip-tools                           | generates strict lockfiles               |
| Schema / Contracts     | JSON Schema                         | single source of truth → codegen         |

## 📖 Step-by-Step Implementation Guide & Error Ledger

### Phase 1: Workspace Initialization
The goal was to establish a strict, hermetic build environment where anyone cloning the repository can build it without relying on local system dependencies.

#### 1. Directory Scaffold & Core Files
```bash
mkdir knowledge-hub-os && cd knowledge-hub-os
touch .bazelversion .bazelrc MODULE.bazel BUILD.bazel
mkdir -p apps/frontend apps/api-gateway apps/auth-service apps/ai-service
mkdir -p libs/event_schemas libs/database
```

#### 2. Bazel Version Pinning (`.bazelversion`)
```plaintext
7.3.1
```
⚠️ **Error 1: Missing Bazel Binary**
* **Error Message:** `bash: bazel: command not found`
* **Root Cause:** The system lacked the `bazelisk` wrapper required to read `.bazelversion` and fetch the correct Bazel executable.
* **Fix:** Installed via Arch Linux package manager: `sudo pacman -S bazelisk`.

#### 3. Workspace Configuration (`.bazelrc`)
We configured Bzlmod and strict symlink handling for the Node ecosystem.
```plaintext
common --enable_bzlmod
build --color=yes
build --show_progress_rate_limit=0.2
build --symlink_prefix=/
build --experimental_convenience_symlinks=ignore
build --check_visibility=true
```

### Phase 2: Package Management Integration
Bazel requires absolute control over dependencies to guarantee deterministic builds. We integrated `pnpm` for Node and `pip-tools` for Python.

#### 1. Node.js Setup (`package.json` & `pnpm-workspace.yaml`)
Configured a `pnpm` workspace to allow native resolution between apps and libs.

⚠️ **Error 2: Workspace Root Installation Blocked**
* **Error Message:** `ERR_PNPM_ADDING_TO_ROOT Running this command will add the dependency to the workspace root...`
* **Root Cause:** `pnpm` safeguards against accidentally installing packages at the root of a monorepo workspace.
* **Fix:** Explicitly used the `-w` flag: `pnpm add -w @nestjs/common...`

#### 2. Python Setup (`requirements.txt`)
Bazel requires a fully resolved lockfile containing all transitive dependencies. Standard pip resolution on the fly is prohibited.

⚠️ **Error 3: Unresolved Transitive Dependencies**
* **Error Message:** `The repository '@@[unknown repo 'pip_311_click' requested from @@rules_python~~pip~pip_311_uvicorn]' could not be resolved`
* **Root Cause:** We provided a `requirements.txt` with only top-level dependencies (`fastapi`, `uvicorn`). Bazel panicked because `uvicorn` required `click`, which wasn't explicitly declared in the lockfile.
* **Fix:** Bootstrapped a local virtual environment and used `pip-tools` to compile a strict lockfile.
```bash
mv apps/ai-service/requirements.txt apps/ai-service/requirements.in
python3 -m venv .venv && source .venv/bin/activate
pip install pip-tools
pip-compile apps/ai-service/requirements.in -o apps/ai-service/requirements.txt
deactivate && rm -rf .venv
```

### Phase 3: Cross-Language Contracts (The Event Backbone)
To prevent payload mismatch bugs, we utilized JSON Schema as the single source of truth to auto-generate types for both TypeScript and Python.

#### 1. JSON Schema Definition
Created `libs/event_schemas/schemas/user.created.json` defining the exact payload structure.

#### 2. Auto-Generation Scripting
We attempted to use a Node script (`generate-types.js`) to generate both TS and Python files.

⚠️ **Error 4: Bazel Sandbox Write Restriction**
* **Error Message:** `EROFS: read-only file system, open '.../UserCreatedEvent.ts'`
* **Root Cause:** Bazel executes builds in a strict, read-only hermetic sandbox to prevent accidental source corruption.
* **Fix:** Modified the script to accept Bazel's explicit `$(location)` output paths inside the `bazel-out/` cache directory via `process.argv`.

⚠️ **Error 5: Isolated `$PATH` Execution Block**
* **Error Message:** `/bin/sh: line 1: datamodel-codegen: command not found`
* **Root Cause:** Bazel strips the host system `$PATH`. The Node script attempted to run a shell command (`execSync('datamodel-codegen...')`), which Bazel blocked.
* **Fix:** Re-architected the generation process. Split the target into two: a genrule for TypeScript, and a `py_binary` target that hermetically linked `@pip//datamodel_code_generator` to run the Python generation securely.

### Phase 4: API Gateway (NestJS Scaffold)
We initialized the TypeScript compiler and built the core API Gateway using `aspect_rules_ts`.

⚠️ **Error 6: Unregistered TypeScript Compiler**
* **Error Message:** `no such package '@@[unknown repo 'npm_typescript' requested from @@]'`
* **Root Cause:** Bazel didn't know which TS compiler to use globally for the monorepo.
* **Fix:** Registered `rules_ts_ext.deps(ts_version_from = "//:package.json")` in `MODULE.bazel`.

⚠️ **Error 7: Semver Range Rejection**
* **Error Message:** `typescript version in package.json must be exactly specified, not a semver range: ^5.9.3`
* **Root Cause:** Bazel rejects non-deterministic ranges (`^` or `~`).
* **Fix:** Hard-pinned the version: `"typescript": "5.9.3"` in `package.json`.

⚠️ **Error 8: Missing Compiler Checksum**
* **Error Message:** `typescript version 5.9.3 is not mirrored in rules_ts, is this a real version?`
* **Root Cause:** `aspect_rules_ts@2.1.0` hardcodes cryptographic SHA hashes for verified versions. 5.9.3 (and 5.4.5) were too new/unrecognized.
* **Fix:** Pinned TypeScript to a known, stable LTS version: `5.2.2`.

⚠️ **Error 9: Unspecified Typecheck Performance**
* **Error Message:** `configurable attribute "skip_lib_check" in @@aspect_rules_ts~//ts:options doesn't match this configuration`
* **Root Cause:** Bazel forced an explicit choice on how to handle `skipLibCheck` for performance.
* **Fix:** Appended `--@aspect_rules_ts//ts:skipLibCheck=always` to `.bazelrc`.

⚠️ **Error 10: Missing Node.js Checksum**
* **Error Message:** `No nodejs is available for linux_amd64 at version 20.11.0`
* **Root Cause:** Similar to Error 8, `rules_nodejs@6.0.2` did not have the internal hashes for newer Node 20.x releases.
* **Fix:** Downgraded the Bazel toolchain Node version to the heavily supported LTS: `18.17.1`.

⚠️ **Error 11: Missing Transpiler Declaration**
* **Error Message:** `You must select a transpiler for ts_project rules, which produces the .js outputs.`
* **Root Cause:** `aspect_rules_ts` v2 requires explicit declaration of the build tool (SWC, Babel, or tsc).
* **Fix:** Added `transpiler = "tsc"` to the `ts_project` rule in `apps/api-gateway/BUILD.bazel`.

### Phase 5: AI Service (FastAPI Scaffold) & Schema Linking
We scaffolded `main.py` and connected the auto-generated Pydantic models.

⚠️ **Error 12: Python Module Resolution Failure**
* **Error Message:** `ModuleNotFoundError: No module named 'libs'`
* **Root Cause:** Python cannot import from directories containing hyphens (`event-schemas`), and Bazel requires explicit `__init__.py` files to recognize directories as packages.
* **Fix:**
  1. Renamed `libs/event-schemas` to `libs/event_schemas`.
  2. Created `libs/__init__.py` and `libs/event_schemas/__init__.py`.
  3. Created `libs/BUILD.bazel` to expose the root module.
  4. Updated `libs/event_schemas/BUILD.bazel` to include `imports = ["."]`.

### Phase 6: The Event-Driven Kafka Bridge
We successfully connected the two hermetic services using Redpanda (Kafka).

1. **Local Broker:** Deployed Redpanda via `docker-compose.yml` exposing port `9092`.
2. **Producer (NestJS):** Implemented `@nestjs/microservices` and `kafkajs`. Configured the `AppController` to publish the strictly-typed `UserCreatedEvent` to the `user.events` topic upon HTTP POST.
3. **Consumer (FastAPI):** Implemented `aiokafka`. Created a background `asyncio` task to consume messages from `user.events`, decode them, and validate them directly against the Bazel-generated `UserCreatedEvent` Pydantic model.

**End-to-End Success Verified:** A curl command to the API Gateway successfully traveled through the Kafka broker and was validated and digested by the AI Service in real-time.

## 🧠 Lessons Learned & Core Principles

* **Zero-Trust Determinism:** Bazel assumes nothing. If a toolchain version, cryptographic hash, or compiler path isn't explicitly defined and locked, the build will fail. This friction up front prevents catastrophic "works on my machine" bugs later.
* **The Sandbox is Absolute:** Build scripts cannot modify the host file system. Code generation tools must be designed to pipe outputs directly to Bazel's `bazel-out` cache directories.
* **Transitive Dependencies Require Lockfiles:** Tools like `pip-tools` are mandatory. Bazel will not fetch unpinned sub-dependencies on the fly.
* **Polyglot Contracts are a Superpower:** By relying on JSON schema and executing generation inside the Bazel graph, it is architecturally impossible for the TypeScript producer and Python consumer to drift out of sync.

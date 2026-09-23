# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

The classroom for a one-day course. The deliverable is **Frank**: an MCP server
with an optional Cloudscape console, in one container, deployed to Azure
Container Apps by GitHub Actions.

**`server/` and `ui/` are empty on purpose.** They contain only `.gitkeep`. They
are built during the class *from the ADRs* in `docs/adr/`. Do not treat their
emptiness as a bug to fix, and do not scaffold them speculatively — scaffold them
when asked, implementing the ADR that governs them (ADR-001/002 for `server/`,
ADR-003 for `ui/`).

`docs/adr/` is the source of truth for design. Read the relevant ADR before
writing code; implementation prompts here reference decisions by number
("implement ADR-003").

## Commands

There is no root package.json. `server/` and `ui/` are self-contained npm
packages (ADR-001, ADR-003):

```bash
cd server && npm ci && npm test && npm run build   # Frank
cd ui     && npm ci && npm test && npm run build   # the console
docker build -t frank .                            # both, from the repo ROOT
docker run -p 3000:3000 frank                      # then GET /healthz
```

Both use vitest. A single file or test:

```bash
npx vitest run test/mcp.test.ts          # one file
npx vitest run -t 'rejects an unknown'   # one test by name
```

`server`'s `npm test` runs `tsc --noEmit` over `src/` **and** `test/` before
vitest, because `npm run build` only compiles `src/`. `ui`'s `npm run build`
typechecks both via `tsc -b`.

The Docker build context is the repository root, not `server/` — the root
`Dockerfile` needs `ui/` too.

## Architecture

One image, one container, one URL (ADR-006):

| Path | Serves |
|---|---|
| `POST /mcp` | MCP over Streamable HTTP (`@modelcontextprotocol/sdk`, Express) |
| `GET /healthz` | 200 for container probes |
| `/` | the built console, from `/app/public` |

- **Port 3000 is fixed in three places that must agree**: `ENV PORT=3000` in
  `Dockerfile`, the `PORT` default in `server/src/config.ts`, and
  `--target-port 3000` in `deploy.yml`.
- **The console is optional.** Frank is deployed and serving MCP long before the
  UI exists; the UI build stage tolerates an empty `ui/`, and the server must
  respond sensibly at `/` when `public/` is empty.
- **No CORS, no `VITE_FRANK_URL`.** ADR-006 superseded that clause of ADR-003:
  the console is served by Frank and calls `/mcp` relatively, so there is no
  cross-origin request to configure.
- **Tools live one module per tool** under `server/src/tools/`, registered in
  `server/src/tools/index.ts`. `define.ts` is where ADR-002 is enforced: it
  throws at module load for an out-of-policy verb, a non-strict input schema, an
  undescribed parameter, or an output schema with no `summary`. Add tools
  through it rather than calling `registerTool` directly.
- **`test/conventions.test.ts` is ADR-002 as a merge gate**, auditing the whole
  registry. The `tool-conventions` agent is a second opinion, not the only check.
- **Frank's Azure scope comes from the environment, never from a tool
  parameter.** The deploy injects `AZURE_SUBSCRIPTION_ID`,
  `AZURE_RESOURCE_GROUP`, `AZURE_CLIENT_ID`, `AZURE_TENANT_ID` and
  `AZURE_CLIENT_SECRET` (a Container Apps secret) so `DefaultAzureCredential`
  picks them up. A caller must not be able to redirect him to another group.

## Tool conventions (ADR-002 — policy, not style)

`verb_noun`, lower snake_case, verb from the **closed set** `get`, `list`,
`search`, `summarize`. `create_*`, `update_*`, `delete_*`, `run_*` are out of
policy: they need a new ADR superseding ADR-002, not a tool. Inputs are `zod`,
strict, every parameter described. Output is JSON with a top-level `summary`
string plus typed detail fields. Errors are `isError: true` with a
plain-language message, never a stack trace. **Frank reads; he never mutates
anything external.** The `frank-tools` skill carries the full rules.

## ADR discipline (ADR-000)

- An **Accepted** ADR is immutable. To change course, write a new ADR that
  supersedes it — naming the exact clauses it replaces if the rest stays in
  force. The only permitted in-place edit is the Status line recording the
  supersession.
- A declined decision is recorded as **Rejected**, not deleted (ADR-007 is the
  worked example).
- `/adr <title>` scaffolds the next number from `docs/adr/template.md`, updates
  the tables in **both** `docs/adr/README.md` and the root `README.md`, and hands
  the draft to the `adr-reviewer` agent. Leave it uncommitted — accepting a
  decision is a human's call.
- Supersession is currently layered: 006 partly supersedes 003/004/005; 010
  supersedes 006's credential model. When a claim about credentials, hosting or
  the pipeline seems to conflict, the later ADR's supersession paragraph says
  precisely which clauses survive.

## Deployment

`.github/workflows/deploy.yml`:

- **Pull requests** build and test `server/` and `ui/` — each job self-skips with
  a notice until the matching `package-lock.json` exists. No Azure involved.
- **Push to `main` deploys.** Those two jobs are deliberately skipped on `main`;
  the Docker build is the single build *and* the test gate, because both stages
  run `npm test`. A red suite fails the image build and nothing ships.
- The pipeline fetches a classroom credential itself from a URL committed in the
  workflow (ADR-010). Students set **no** secrets or variables. The container app
  name derives from `github.repository_owner`.
- `az acr build` + `az containerapp create/update`, deliberately **not**
  `az containerapp up --source .`, which crashes on some azure-cli builds.

## Security ground rules

- Never put credentials in the repo, in `CLAUDE.md`, in an ADR, or in a prompt.
  Run the `secret-scanner` agent before committing or sharing a screen.
- The classroom credential is public *by design* and over-privileged
  (Contributor where Frank only reads) — ADR-010 states exactly what that costs
  and why it is indefensible outside a disposable subscription. The read-only
  guarantee lives in the tool surface, not in the credential.
- `POST /mcp` is unauthenticated; ADR-007 records that as a considered,
  bounded trade-off with the conditions that would force a successor ADR.
- Pushing to `main` deploys to Azure, so work on a branch and merge via PR.

## Agents and skills in `.claude/`

These are working examples you inherit, not scaffolding to delete.

| | Use it for |
|---|---|
| `adr-reviewer` (opus) | judging whether an ADR is implementable and self-consistent |
| `tool-conventions` (haiku) | auditing `server/src/tools/` against ADR-002 |
| `secret-scanner` (haiku) | sweeping the tree for credentials before a commit |
| `frank-tools` skill | the tool rules, loaded when tools are being written |

Model choice is deliberate: reasoning work on opus, mechanical breadth on haiku.
All three agents are restricted to `Read, Grep, Glob` — a reviewer that can edit
the repository is not a reviewer. Skill and agent descriptions are routing hints
to a probabilistic model, not dispatch rules; name the agent explicitly when
delegation has to happen.

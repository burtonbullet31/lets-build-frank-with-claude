# ADR-009: Let Frank read what is running in his own resource group

**Status:** Proposed
**Date:** 2026-09

**Supersedes ADR-004's identity clause** — *"the Container App gets a
system-assigned managed identity at creation. It starts with no role
assignments — ADR-009 decides exactly what read access it receives and at what
scope."* ADR-009's answer is **none**: the identity is not used and is not
created (`deploy.yml` passes no `--system-assigned`). Frank authenticates with
ADR-010's shared credential. ADR-010 replaced that mechanism without naming
ADR-004, and ADR-006 — Accepted — had explicitly kept it in force; this ADR
closes the clause it was named in. The rest of ADR-004 stands.

> **Separately, for a human to resolve:** ADR-006 also keeps ADR-004's *"one
> resource group per student"* in force, and ADR-010 collapsed the class onto
> one shared group without recording that either. Same gap, adjacent clause. It
> is ADR-010's to fix, not this one's.

## Context

ADR-010 already puts the credential in the container; only scope and surface
are left to decide.

Two constraints shape them. **The credential is Contributor**, not `Reader`: it
can create and delete, and only ADR-002's closed verb set stops it. And **`POST
/mcp` is unauthenticated** — ADR-007 declined authentication explicitly because
Frank's Azure tools would read one resource group, expose an inventory and no
more, and take no parameter pointing him elsewhere. This ADR is where that
promise is kept or quietly broken.

## Decision

**Scope comes from the environment, never from a caller.** Frank reads exactly
`AZURE_RESOURCE_GROUP` within `AZURE_SUBSCRIPTION_ID`. Both tools take **no
input** — `z.object({}).strict()`. No subscription, group or resource-id
parameter, now or later. It is doubly bound: ADR-010's credential is Contributor
on that one group, so a redirected Frank gets 403 anyway.

**Two tools**, added through `defineTool` under `server/src/tools/`:

- **`list_resources`** — every resource in the group. Per resource: **name, type
  and location, and nothing else.**
- **`summarize_resource_group`** — name, location, total, and a count per type.
  **No ARM resource id**, in the fields or in the `summary` string: the group's
  id embeds the subscription GUID.

Both output shapes are pinned by key in `test/conventions.test.ts`, as
`get_status`' three fields already are — that is what makes the ceiling below a
merge gate rather than a sentence.

**Client.** `@azure/identity` and `@azure/arm-resources`, one client built lazily
on first call. List operations only.

**Scope read at boot, enforced per call.** The two variables are captured in
`config` at load as optional strings; each handler checks them and, when one is
missing, **throws an `Error` whose message is already the plain sentence** —
the only route to ADR-002's `isError`, since a handler can otherwise return only
its success object.

**Azure errors are translated, never rethrown.** `toErrorResult` interpolates a
thrown message straight into caller-visible text, so log the SDK error and throw
a new plain sentence. Rethrowing an ARM `RestError` ships the subscription GUID
and the client id to an anonymous caller.

## Consequences

- **The demo works**, and the read-only rule is visibly what makes an
  over-privileged credential survivable. That contrast is the lesson.
- **The group is the cohort's, not the student's.** `list_resources` enumerates
  every classmate's container app from any one student's FQDN — and each app
  name is that classmate's lowercased GitHub account, since `deploy.yml` derives
  it from `github.repository_owner`. An anonymous caller gets a roster of the
  room. Say it in class rather than discovering it in the room.
- **Name and type are endpoint-equivalent for some types** — a registry name
  yields `<acr>.azurecr.io`, whose admin user is enabled. Excluding properties is
  still right, but this is the honest reason it is not sufficient: what guards
  those endpoints is a credential public by design (ADR-010).
- **This is the tool ADR-007 was waiting for.** Its revisit conditions now bind:
  any later tool returning tags, properties, metrics, logs or configuration needs
  **a new ADR re-deciding authentication** first — ADR-007 is Rejected, and
  ADR-000 reserves supersession for Accepted decisions. Inventory is the ceiling,
  not a starting point.
- **Rejected: a `resource_group` parameter.** One line of zod, and an anonymous
  caller could enumerate every group the credential reaches. An optional one
  defaulting to the environment is the same hole with a default.
- **Rejected: `get_resource` by id** — an id is a group name in a different hat.
- **Rejected: registering the tools only when Azure is configured.** `tools/list`
  would differ between a laptop and the container, and a broken deploy would
  present as a missing feature.
- **Costs:** two sizeable dependencies in the image, a cold start that now
  includes token acquisition, and no caching — every call hits ARM, fine for a
  dozen resources and not at scale.

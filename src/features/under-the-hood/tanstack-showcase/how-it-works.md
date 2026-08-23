# How the TanStack showcase works

Three versions of one ticket app, each with a different data layer underneath and
the same UI on top. This explains what each layer actually does — grounded in the
code in this folder, with the real numbers it uses.

---

## The detail

### Terms (read these first)

- `key` = "the label a piece of data is filed under. Here, `["tickets","detail",3]` means *ticket 3's detail*."
- `cache` = "a map from `key` to the last answer the server gave for it."
- `dataUpdatedAt` = "the moment an answer was written into the cache."
- `staleTime` = "how long an answer counts as still good. Ours is 30 seconds."
- `gcTime` = "how long an answer nobody is watching is kept before being thrown away. Default 5 minutes."
- `observer` = "a mounted component watching a key. A key with no observers is *inactive*."
- `invalidate` = "mark answers as old, so the next person who asks triggers a fetch."
- `collection` = "a set of rows held on the client, filed by id rather than by key."
- `live query` = "a question asked of the collection — `where status = open` — that re-answers itself whenever the rows underneath change."
- `optimistic` = "applied locally before the server has agreed to it."
- `transaction` = "the unit of work that can be undone if the server says no."

### Rung 0 — by hand

`rungs/rung0-naive/useTickets.ts`. Data lives in `useState`, and fetching is
something you *start*, in an effect:

```
select ticket 3  →  setState(loading)  →  fetch /tickets/3  →  setState(data)
```

There is nowhere to keep an answer between mounts, so the cost of opening the
same ticket `N` times is:

```
requests = N
spinners = N
```

Two smaller costs are easy to miss. First, responses can land out of order — our
fake server has jitter — so the code needs a cancellation flag, or selecting
ticket 3 then 4 can leave you looking at 3. Second, after every write you have to
refetch *by hand*, and you have to remember everything the write touched. Forget
one and the screen shows stale data with no error anywhere.

### Rung 1 — TanStack Query

`rungs/rung1-query/useTickets.ts`. Fetching is no longer started; it's
*declared*. You say what a key means and Query decides whether it needs asking
for. The decision, on every mount:

```
isStale  =  (now − dataUpdatedAt)  >  staleTime

data exists and not isStale   →  paint from cache, send nothing
data exists and isStale       →  paint from cache, fetch fresh behind it
no data                       →  fetch
```

That middle line is *stale-while-revalidate*, and it's why the network panel
distinguishes `(from cache)` from `(cache · stale)` — one costs a request and the
other doesn't. With our `STALE_TIME = 30_000`, opening the same ticket `N` times
within 30 seconds costs:

```
requests = 1
spinners = 1
```

**Deduplication.** Two observers asking for the same key while a fetch is already
in flight get *one* request, not two. This is visible in the entry: at rung 0,
React's StrictMode double-invokes effects in development and the log shows two
identical `GET /tickets`; at rung 1 the same double-mount produces one.

**Invalidation.** A write ends with one line:

```
invalidateQueries({ queryKey: ["tickets"] })
```

which marks *every* key beginning with `tickets` as stale — the list, every
detail, and any view added later. That's the fix for rung 0's forgetting problem:
you can't leave a cache out of a list you never wrote.

### Rung 2 — TanStack DB

`rungs/rung2-db/collection.ts`. A collection sits on top of rung 1's Query
(`queryCollectionOptions`), so Query still fetches and DB holds the result as
rows filed by `getKey`. Two things follow.

**Reads stop touching the network.** The detail view is a live query over rows
that are already here:

```
from({ ticket: collection }).where(ticket.id = 3)
```

Live queries recompute *incrementally* — when a row changes, the delta is
propagated rather than the query re-run — so this is a local lookup, not a
request. Rung 1 still paid for the first open of each ticket. Rung 2 pays:

```
requests = 1   (the collection's own load, once)
per open = 0
```

**Writes land before the server hears about them.** `collection.update(id, …)`
changes the row locally, every live query watching it updates in the same tick,
and the handler is called afterwards:

```
apply locally  →  live queries recompute  →  onUpdate(…)  →  server
                                                 └── throws → optimistic layer dropped
```

Nothing in this repo restores the row on failure. DB drops the optimistic
transaction itself, and every view showing that row reverts together. Compare
rung 1, where the same effect means writing `onMutate`, snapshotting each
affected key, and restoring them all in `onError` — and knowing which keys those
are.

### Why it works

Each rung moves one decision from you to the library — *when to fetch* at rung 1,
*where the data lives* at rung 2 — and every request that disappears is a
decision you no longer have to remember to make.

---

## What's real here, and what isn't

The **network is fake**: `engine/server.ts` is an in-memory store with a latency
dial, because the site is static and there is no backend. Latency is a real
`setTimeout`, so waiting is real waiting.

Everything reported about the libraries is **real, and self-reported**:

- Cache events come from subscribing to Query's own `QueryCache`
  (`useQueryInstrumentation.ts`). Nothing decides when a cache hit happened
  except Query.
- Live-query activity comes from `collection.subscribeChanges` — DB saying its
  result set moved.

The distinction matters: had these been hand-placed `emit()` calls next to the
code that reads data, the panel would be showing our *beliefs* about the
libraries rather than the libraries.

Events are correlated by an explicit `trace` (a query key, or an endpoint) rather
than by ordering, because with jitter on, responses land out of order and an
ordering heuristic would quietly mis-attribute them.

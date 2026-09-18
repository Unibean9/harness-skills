# Component Architecture Basics

## Split logic from presentation

Keep "what data does this show" separate from "how does it look". A
component that fetches data, transforms it, AND renders markup is harder to
test and reuse than one split into a data-handling piece and a
presentation piece.

## When to split into a new component

Split when:
- The same markup/behavior is needed in more than one place.
- A section has its own independent state or loading/error handling.
- The current component is hard to read in one glance.

Don't split just because a piece is small - an extra layer of indirection
for a 3-line snippet used once adds navigation overhead without payoff.

## Local state before global state

Default to state that lives inside the component that needs it (e.g. is
this dropdown open?). Reach for global/shared state (context, a store) only
when multiple, unrelated components genuinely need the same value at the
same time. Promoting everything to global state too early makes it harder
to trace where a value changes and why.

## Minimal fetch/loading/error example

```
function useOrders(userId) {
  state = { status: "loading", data: null, error: null }

  on mount:
    try:
      data = await api.getOrders(userId)
      state = { status: "success", data, error: null }
    catch (err):
      state = { status: "error", data: null, error: err }

  return state
}

// in the component:
if state.status == "loading": render Spinner
if state.status == "error":   render ErrorMessage(state.error)
if state.status == "success": render OrderList(state.data)
```

Three explicit states (loading/error/success) instead of guessing from
`data == null` - makes each render branch unambiguous.

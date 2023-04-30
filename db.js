import goodbye from 'graceful-goodbye'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
const adapter = new JSONFile('db.json')
const default_data = []
const db = new Low(adapter, default_data)
await db.read()
goodbye(async _ => await db.write())
const events = db.data

export function handleEvent(data) {
    events.push(data)
}

const filtersHandlers = {
    ids: (event, filter) => filter.some(id => event.id.startsWith(id)),
    kinds: (event, filter) => filter.some(kind => event.kind === kind),
    authors: (event, filter) => filter.some(author => event.pubkey.startsWith(author)),
    since: (event, filter) => event.created_at >= filter,
    until: (event, filter) => event.created_at <= filter,
}

export function queryEvents(filters) {
    return filterOrQueryEvents(events, filters)
}

export function filterEvents(events, filters) {
    return filterOrQueryEvents(events, filters, { no_limit: true })
}

function filterOrQueryEvents(initial_data, _filters, { no_limit } = {}) {
    const filters = _filters.map(filter => Object.entries(filter))
    let data = [...initial_data]
        .filter(event => 
            filters
            .map(filter => 
                filter
                .filter(([key])=> key in filtersHandlers && key !== 'limit')
                .map(([key, value])=>
                    filtersHandlers[key](event, value)
                )
                .every(Boolean)
            )
            .some(Boolean)
        )
    let limit = !no_limit && Math.max.apply(undefined, filters.filter(filter => 'limit' in filter).map(filter => filter.limit)) || Infinity
    return data.sort((a, b) => b.created_at - a.created_at).slice(0, limit)
}
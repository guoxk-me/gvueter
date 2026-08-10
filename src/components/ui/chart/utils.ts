import type { Component } from 'vue'
import type { ChartConfig } from '.'
import { isClient } from '@vueuse/core'
import { h, render } from 'vue'

const MAX_TOOLTIP_CACHE_ENTRIES = 200

function serializeKey(value: unknown): string {
  const references = new WeakMap<object, number>()
  let nextReference = 0

  function serialize(candidate: unknown): string {
    if (candidate === null) return 'null'

    switch (typeof candidate) {
      case 'undefined':
        return 'undefined'
      case 'boolean':
        return `boolean:${candidate}`
      case 'bigint':
        return `bigint:${candidate.toString()}`
      case 'number':
        if (Number.isNaN(candidate)) return 'number:NaN'
        if (Object.is(candidate, -0)) return 'number:-0'
        return `number:${candidate}`
      case 'string':
        return `string:${JSON.stringify(candidate)}`
      case 'symbol':
        return `symbol:${candidate.description ?? ''}`
      case 'function':
        return `function:${candidate.name}`
      case 'object': {
        const existingReference = references.get(candidate)
        if (existingReference !== undefined) return `reference:${existingReference}`

        const reference = nextReference
        nextReference += 1
        references.set(candidate, reference)

        if (candidate instanceof Date) {
          const timestamp = candidate.getTime()
          return `date:${Number.isNaN(timestamp) ? 'invalid' : candidate.toISOString()}`
        }
        if (Array.isArray(candidate)) {
          return `array:${reference}:[${candidate.map(serialize).join(',')}]`
        }

        const entries = Object.entries(candidate as Record<string, unknown>).sort(
          ([firstKey], [secondKey]) => firstKey.localeCompare(secondKey),
        )
        return `object:${reference}:{${entries
          .map(([key, entry]) => `${JSON.stringify(key)}:${serialize(entry)}`)
          .join(',')}}`
      }
    }

    return 'unknown'
  }

  return serialize(value)
}

function getTooltipPayload(data: unknown): unknown {
  if (typeof data === 'object' && data !== null && 'data' in data)
    return (data as Record<string, unknown>).data

  return data
}

export function componentToString<P extends Record<string, unknown> = Record<string, never>>(
  config: ChartConfig,
  component: Component,
  props?: P,
) {
  if (!isClient) return

  const cache = new Map<string, string>()

  // https://unovis.dev/docs/auxiliary/Crosshair#component-props
  return (tooltipData: unknown, x: number | Date): string => {
    const data = getTooltipPayload(tooltipData)
    const serializedKey = serializeKey([data, x])
    const cachedContent = cache.get(serializedKey)
    if (cachedContent !== undefined) {
      cache.delete(serializedKey)
      cache.set(serializedKey, cachedContent)
      return cachedContent
    }

    const vnode = h(component, { ...props, payload: data, config, x })
    const div = document.createElement('div')
    render(vnode, div)
    const content = div.innerHTML
    render(null, div)

    // AI modified: keep detached tooltip renders bounded and release evicted component instances.
    cache.set(serializedKey, content)
    if (cache.size > MAX_TOOLTIP_CACHE_ENTRIES) {
      const oldestKey = cache.keys().next().value
      if (oldestKey !== undefined) cache.delete(oldestKey)
    }
    return content
  }
}

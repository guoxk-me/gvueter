export interface JsonInspection {
  isValid: boolean
  expandedText: string
  collapsedText: string
}

const invalidJsonInspection: JsonInspection = {
  isValid: false,
  expandedText: '',
  collapsedText: '',
}

export function inspectJson(jsonSource: unknown): JsonInspection {
  try {
    // AI modified: string inputs are treated as serialized JSON so invalid API payloads remain visible as errors.
    const jsonValue: unknown
      = typeof jsonSource === 'string' ? (JSON.parse(jsonSource) as unknown) : jsonSource
    const expandedText = JSON.stringify(jsonValue, null, 2)
    const collapsedText = JSON.stringify(jsonValue)

    if (expandedText === undefined || collapsedText === undefined)
      return invalidJsonInspection

    return { isValid: true, expandedText, collapsedText }
  }
  catch {
    return invalidJsonInspection
  }
}

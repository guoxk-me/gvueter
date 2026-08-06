export type SearchFormFieldValue = boolean | null | number | string | undefined

export type SearchFormValues = Record<string, SearchFormFieldValue>

export interface SearchFormOption {
  label: string
  value: string
}

export interface SearchFormField<TValues extends SearchFormValues> {
  name: Extract<keyof TValues, string>
  label: string
  type: 'date' | 'email' | 'number' | 'search' | 'select' | 'text'
  placeholder?: string
  options?: readonly SearchFormOption[]
  inputMode?: 'decimal' | 'email' | 'numeric' | 'search' | 'text' | 'url'
}

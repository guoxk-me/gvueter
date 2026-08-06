export interface SearchableSelectOption<TValue extends string = string> {
  value: TValue
  label: string
  keywords?: readonly string[]
  disabled?: boolean
}

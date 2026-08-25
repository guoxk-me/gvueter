export const ADMIN_DISPLAY_TIME_ZONE = 'Asia/Shanghai'
export const EMPTY_DISPLAY_LABEL = '—'

type DisplayDateInput = Date | number | string | null | undefined
type DisplayNumberInput = number | null | undefined

export interface DateTimeLabelOptions extends Omit<Intl.DateTimeFormatOptions, 'timeZone'> {
  locale: string
  timeZone: string
  emptyLabel?: string
}

export interface NumberLabelOptions extends Intl.NumberFormatOptions {
  locale: string
  emptyLabel?: string
}

export interface CurrencyLabelOptions extends Omit<NumberLabelOptions, 'currency' | 'style'> {
  currency: string
}

export interface PercentageLabelOptions extends Omit<NumberLabelOptions, 'style'> {}

export interface FileSizeLabelOptions {
  locale: string
  emptyLabel?: string
}

function isDisplayNumber(amount: DisplayNumberInput): amount is number {
  return typeof amount === 'number' && Number.isFinite(amount)
}

export function getDateTimeLabel(
  dateInput: DisplayDateInput,
  options: DateTimeLabelOptions,
): string {
  const { locale, timeZone, emptyLabel = EMPTY_DISPLAY_LABEL, ...dateTimeOptions } = options
  if (dateInput === null || dateInput === undefined || dateInput === '')
    return emptyLabel

  const date = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (Number.isNaN(date.getTime()))
    return emptyLabel

  // AI modified: displayed dates always declare locale and business timezone for deterministic output.
  return new Intl.DateTimeFormat(locale, { ...dateTimeOptions, timeZone }).format(date)
}

export function getNumberLabel(amount: DisplayNumberInput, options: NumberLabelOptions): string {
  const { locale, emptyLabel = EMPTY_DISPLAY_LABEL, ...numberOptions } = options
  if (!isDisplayNumber(amount))
    return emptyLabel

  return new Intl.NumberFormat(locale, numberOptions).format(amount)
}

export function getCurrencyLabel(
  amount: DisplayNumberInput,
  options: CurrencyLabelOptions,
): string {
  const { currency, ...numberOptions } = options
  if (!/^[A-Z]{3}$/.test(currency))
    throw new RangeError('Currency must use an uppercase ISO 4217 code.')

  return getNumberLabel(amount, {
    ...numberOptions,
    currency,
    style: 'currency',
  })
}

/**
 * Displays percentage points, so 6.4 is rendered as 6.4% rather than 640%.
 */
export function getPercentageLabel(
  percentagePoints: DisplayNumberInput,
  options: PercentageLabelOptions,
): string {
  if (!isDisplayNumber(percentagePoints))
    return options.emptyLabel ?? EMPTY_DISPLAY_LABEL

  return getNumberLabel(percentagePoints / 100, {
    ...options,
    style: 'percent',
  })
}

export function getFileSizeLabel(bytes: DisplayNumberInput, options: FileSizeLabelOptions): string {
  const { locale, emptyLabel = EMPTY_DISPLAY_LABEL } = options
  if (!isDisplayNumber(bytes) || bytes < 0)
    return emptyLabel

  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const
  const unitIndex
    = bytes === 0 ? 0 : Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const amount = bytes / 1024 ** unitIndex
  const fractionDigits = unitIndex === 0 || amount >= 10 ? 0 : 1
  const amountLabel = getNumberLabel(amount, {
    locale,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
  const unit = units[unitIndex] ?? 'TB'

  return `${amountLabel} ${unit}`
}

export type Operation<T> = (value: T, ...parameters: Array<T>) => Array<T>

export const array: Operation<any> = (_, ...values) => values
export const spread: Operation<any> = (_, value) => value

export const slice: Operation<any> = (_, first, end, ...values) => values.slice(first, end)
export const current: Operation<any> = (value) => [value]

export * from "./arithmetic"

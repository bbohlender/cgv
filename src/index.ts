export type Operation<T> = (...values: Array<() => Promise<T>>) => Array<() => Promise<T>>

export * from "./parser"
export * from "./interprete"

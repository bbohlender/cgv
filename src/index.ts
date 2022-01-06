export type Operation<T> = (...values: Array<() => Promise<Array<T>>>) => Array<() => Promise<Array<T>>>

export * from "./parser"
export * from "./interprete"

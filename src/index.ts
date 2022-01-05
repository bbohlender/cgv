export type Operation<T> = (...values: Array<T | any>) => Array<T>

export * from "./parser"
export * from "./interprete"

import { Operations } from "cgv"
import { createContext, HTMLProps, PropsWithChildren, useContext } from "react"
import { StateSelector, EqualityChecker, UseBoundStore } from "zustand"
import { OperationGUIMap } from "./gui"
import { BaseState, BaseStateFunctions } from "./base-state"

export type BaseDomainContext<T> = {
    operationGuiMap: OperationGUIMap
    Viewer: (props: HTMLProps<HTMLDivElement>) => JSX.Element
    store: UseBaseStore<T>
    operations: Operations<any, any>
}

export const domainContext = createContext<BaseDomainContext<any>>(null as any)

export const useBaseGlobal = () => useContext(domainContext)

export type UseBaseStore<T = unknown> = UseBoundStore<BaseState & BaseStateFunctions & T>

export function useBaseStore<T = unknown>(): UseBaseStore<T> {
    return useContext(domainContext).store
}

export function useBaseStoreState<U, T = unknown>(
    selector: StateSelector<BaseState & T, U>,
    equalityFn?: EqualityChecker<U>
): U {
    return useBaseStore<T>()(selector, equalityFn)
}

export function DomainProvider<T>({ children, ...context }: PropsWithChildren<BaseDomainContext<T>>) {
    return <domainContext.Provider value={context}>{children}</domainContext.Provider>
}

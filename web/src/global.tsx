import { Operations } from "cgv"
import { createContext, HTMLProps, PropsWithChildren, useContext } from "react"
import { StateSelector, EqualityChecker, UseBoundStore } from "zustand"
import { OperationGUIMap } from "./gui"
import { BaseState, BaseStateFunctions } from "./base-state"

export type BaseDomainContext = {
    operationGuiMap: OperationGUIMap
    Viewer: (props: HTMLProps<HTMLDivElement>) => JSX.Element
    store: UseBaseStore
    operations: Operations<any, any>
}

export const domainContext = createContext<BaseDomainContext>(null as any)

export const useBaseGlobal = () => useContext(domainContext)

export type UseBaseStore = UseBoundStore<BaseState & BaseStateFunctions>

export function useBaseStore(): UseBaseStore {
    return useContext(domainContext).store
}

export function useBaseStoreState<U>(selector: StateSelector<BaseState, U>, equalityFn?: EqualityChecker<U>): U {
    return useBaseStore()(selector, equalityFn)
}

export function DomainProvider({ children, ...context }: PropsWithChildren<BaseDomainContext>) {
    return <domainContext.Provider value={context}>{children}</domainContext.Provider>
}

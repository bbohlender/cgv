import { Operations, createBaseGrammar } from "cgv"
import { createContext, HTMLProps, PropsWithChildren, useContext, useMemo } from "react"
import { StateSelector, EqualityChecker } from "zustand"
import { OperationGUIMap } from "./gui"
import { createStore, State } from "./state"

type DomainContext = {
    operationGuiMap: OperationGUIMap
    Viewer: (props: HTMLProps<HTMLDivElement>) => JSX.Element
    store: UseStore
    operations: Operations<any, any>
}

const domainContext = createContext<DomainContext>(null as any)

export const useGlobal = () => useContext(domainContext)

export type UseStore = ReturnType<typeof createStore>

export function useStore(): UseStore {
    return useContext(domainContext).store
}

export function useStoreState<U>(selector: StateSelector<State, U>, equalityFn?: EqualityChecker<U>): U {
    return useStore()(selector, equalityFn)
}

export function DomainProvider({
    children,
    ...context
}: PropsWithChildren<Omit<DomainContext, "store"> & { operations: Operations<any, any> }>) {
    const store = useMemo(() => createStore(createBaseGrammar(), context.operations), [context.operations])
    return <domainContext.Provider value={{ ...context, store }}>{children}</domainContext.Provider>
}

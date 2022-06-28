import { Operations } from "cgv"
import { createContext, HTMLProps, PropsWithChildren, useContext } from "react"
import { StateSelector, EqualityChecker, StateListener, StateSliceListener, GetState, SetState, Destroy } from "zustand"
import { OperationGUIMap } from "./gui"
import { BaseStore } from "./base-state"

export type BaseDomainContext = {
    operationGuiMap: OperationGUIMap
    Viewer: (props: HTMLProps<HTMLDivElement>) => JSX.Element
    store: UseBaseStore
    operations: Operations<any>
}

export const domainContext = createContext<BaseDomainContext>(null as any)

export const useBaseGlobal = () => useContext(domainContext)

export type UseBaseStore = {
    (): BaseStore
    <U>(selector: StateSelector<BaseStore, U>, equalityFn?: EqualityChecker<U>): U
    setState: SetState<BaseStore>
    getState: GetState<BaseStore>
    destroy: Destroy
    subscribe: {
        (listener: StateListener<BaseStore>): () => void
        <StateSlice>(
            selector: StateSelector<BaseStore, StateSlice>,
            listener: StateSliceListener<StateSlice>, //okay (same as in subscribeWithSelector)
            options?:
                | {
                      equalityFn?: EqualityChecker<StateSlice>
                      fireImmediately?: boolean
                  }
                | undefined
        ): () => void
    }
}

export function useBaseStore(): UseBaseStore {
    return useContext(domainContext).store
}

export function useBaseStoreState<U>(selector: StateSelector<BaseStore, U>, equalityFn?: EqualityChecker<U>): U {
    return useBaseStore()(selector, equalityFn)
}

export function DomainProvider({ children, ...context }: PropsWithChildren<BaseDomainContext>) {
    return <domainContext.Provider value={context}>{children}</domainContext.Provider>
}

import { createBaseGrammar } from "cgv"
import { operations } from "cgv/domains/shape"
import { ReactNode, useContext } from "react"
import create, { EqualityChecker, StateSelector } from "zustand"
import { combine } from "zustand/middleware"
import { BaseDomainContext, domainContext, DomainProvider, UseBaseStore } from "../../global"
import { BaseState, createBaseStateFunctions, createBaseStateInitial } from "../../base-state"
import { operationGuiMap } from "./gui"
import { Viewer } from "./gui/viewer"
import {
    createViewerStateFunctions,
    createViewerStateInitial,
    NumberTuple3,
    ViewerState,
    ViewerStateFunctions,
} from "./gui/viewer-state"

//TODO
export const panoramas: Array<{ url: string; position: NumberTuple3; rotationOffset: number }> = [
    {
        position: [0, 2, 0],
        url: "/cgv/panorama-1.jpg",
        rotationOffset: 0,
    },
    {
        position: [-6.356732023711336, 2, -7.341277377555825],
        url: "/cgv/panorama-2.jpg",
        rotationOffset: Math.PI / 2,
    },
    {
        position: [-6.357632544002161, 2, 8.817223061904349],
        url: "/cgv/panorama-3.jpg",
        rotationOffset: Math.PI / 2,
    },
    {
        position: [-12.685182954572484, 2, -0.9930769947840974],
        url: "/cgv/panorama-4.jpg",
        rotationOffset: 0,
    },
]

const baseGrammar = createBaseGrammar()

const store = create(
    combine({ ...createBaseStateInitial(baseGrammar), ...createViewerStateInitial() }, (set, get) => ({
        ...createBaseStateFunctions(operations, set, get),
        ...createViewerStateFunctions(set, get),
    }))
)

type ShapeSpecificState = ViewerState & ViewerStateFunctions

export function ShapeDomainProvider({ children }: { children?: ReactNode | undefined }) {
    return (
        <DomainProvider<ViewerState & ViewerStateFunctions>
            Viewer={Viewer}
            operationGuiMap={operationGuiMap}
            operations={operations}
            store={store}>
            {children}
        </DomainProvider>
    )
}

export const useShapeGlobal = () => useContext<BaseDomainContext<ShapeSpecificState>>(domainContext)

export function useShapeStore(): UseBaseStore<ShapeSpecificState> {
    return useShapeGlobal().store
}

export function useShapeStoreState<U>(
    selector: StateSelector<BaseState & ShapeSpecificState, U>,
    equalityFn?: EqualityChecker<U>
): U {
    return useShapeStore()(selector, equalityFn)
}

import { Euler, Quaternion } from "three"
import { GetState, SetState } from "zustand"
import { topPosition } from "./camera"

export type NumberTuple4 = [number, number, number, number]
export type NumberTuple3 = [number, number, number]
export type NumberTuple2 = [number, number]

export type TopDownViewerState = {
    type: "2d"
    position: NumberTuple3
}

export type PanoramaViewerState = {
    type: "3d"
    panoramaIndex: number
    rotation: NumberTuple4
}

export type ViewerState = {
    s1CurrentState: boolean
    s1: TopDownViewerState | PanoramaViewerState
    s2: TopDownViewerState | PanoramaViewerState | undefined
}

export function quternionToTuple(q: Quaternion): NumberTuple4 {
    return [q.x, q.y, q.z, q.w]
}

const euler = new Euler(0, 0, 0, "YXZ")
const qHelp = new Quaternion()
const panoramaRotation = quternionToTuple(new Quaternion())

function changeCurrentView(
    { s1, s1CurrentState, s2 }: ViewerState,
    currentState: TopDownViewerState | PanoramaViewerState
): ViewerState {
    return {
        s1CurrentState,
        s1: s1CurrentState ? currentState : s1,
        s2: s1CurrentState ? s2 : currentState,
    }
}

function changeNextView(viewerState: ViewerState, nextState: PanoramaViewerState | TopDownViewerState): ViewerState {
    const prevState = getCurrentViewState(viewerState)
    const s1CurrentState = !viewerState.s1CurrentState
    return {
        s1CurrentState,
        s1: s1CurrentState ? nextState : prevState,
        s2: s1CurrentState ? prevState : nextState,
    }
}

export function getCurrentViewState(state: ViewerState) {
    const currentState = state.s1CurrentState ? state.s1 : state.s2
    if (currentState == null) {
        throw new Error("current state cant be undefined")
    }
    return currentState
}

export function createViewerStateInitial(): ViewerState {
    return {
        s1CurrentState: true,
        s1: {
            type: "2d",
            position: [0, 100, 0],
        },
        s2: undefined,
    }
}

export function createViewerStateFunctions(set: SetState<ViewerState>, get: GetState<ViewerState>) {
    return {
        translateView: (by: NumberTuple2) => {
            const viewState = get()
            const currentState = getCurrentViewState(viewState)
            if (currentState.type === "2d") {
                set(
                    changeCurrentView(viewState, {
                        ...currentState,
                        position: [
                            currentState.position[0] + by[0],
                            currentState.position[1],
                            currentState.position[2] + by[1],
                        ],
                    })
                )
            }
        },
        rotateView: ([x, y]: NumberTuple2) => {
            const viewState = get()
            const currentState = getCurrentViewState(viewState)
            if (currentState.type === "3d") {
                qHelp.set(...currentState.rotation)
                euler.setFromQuaternion(qHelp)
                euler.x = Math.min(Math.max(euler.x - y * 0.005, -Math.PI / 2), Math.PI / 2)
                euler.y -= x * 0.005
                qHelp.setFromEuler(euler)
                set(
                    changeCurrentView(viewState, {
                        ...currentState,
                        rotation: [qHelp.x, qHelp.y, qHelp.z, qHelp.w],
                    })
                )
            }
        },
        zoomView: (by: number) => {
            const viewState = get()
            const currentState = getCurrentViewState(viewState)
            if (currentState.type === "2d") {
                set(
                    changeCurrentView(viewState, {
                        ...currentState,
                        position: [currentState.position[0], currentState.position[1] + by, currentState.position[2]],
                    })
                )
            }
        },
        changeView: (state: PanoramaViewerState | TopDownViewerState) => set(changeNextView(get(), state)),
        exitPanoramaView: (panoramaIndex: number) => {
            const viewState = get()
            const currentState = getCurrentViewState(viewState)
            if (currentState.type === "3d" && currentState.panoramaIndex === panoramaIndex) {
                set(
                    changeNextView(get(), {
                        type: "2d",
                        position: topPosition,
                    })
                )
            }
        },
        changePanoramaView: (newState: Omit<PanoramaViewerState, "rotation">) => {
            const viewState = get()
            const prevState = getCurrentViewState(viewState)
            const rotation = prevState.type === "3d" ? prevState.rotation : panoramaRotation
            const s1CurrentState = !viewState.s1CurrentState
            const nextState = {
                ...newState,
                rotation,
            }
            set({
                s1CurrentState,
                s1: s1CurrentState ? nextState : prevState,
                s2: s1CurrentState ? prevState : nextState,
            })
        },
    }
}

export type ViewerStateFunctions = ReturnType<typeof createViewerStateFunctions>

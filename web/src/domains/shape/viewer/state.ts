import { Euler, Object3D, Vector2Tuple, Vector3Tuple } from "three"
import { GetState, SetState } from "zustand"
import { CombineEmpty } from "../../../base-state"
import create from "zustand"
import { combine, subscribeWithSelector } from "zustand/middleware"
import { panoramas } from "../global"
import { Primitive } from "cgv/domains/shape"
import produce from "immer"

export const FOV = 60

const FOVinRadians = (FOV / 180) * Math.PI

export type TopDownViewerState = {
    viewType: "2d"
    position: Vector3Tuple
}

export type PanoramaViewerState = {
    viewType: "3d"
    panoramaIndex: number
    rotation: Vector3Tuple
}

export type ResultViewerState = {
    result: Object3D | undefined
    error: string | undefined
    primitiveMap: PrimitiveMap
}

export type PrimitiveMap = { [Key in string]: Primitive }

export type ViewerState = (
    | CombineEmpty<TopDownViewerState, PanoramaViewerState>
    | CombineEmpty<PanoramaViewerState, TopDownViewerState>
) &
    ResultViewerState & {
        showBackground: boolean
    }

export function eulerToTuple(q: Euler): Vector3Tuple {
    return [q.x, q.y, q.z]
}

const euler = new Euler(0, 0, 0, "YXZ")
const panoramaRotation: Vector3Tuple = [0, 0, 0]

export const topPosition: Vector3Tuple = [0, 400, 0]
export const topRotation = eulerToTuple(new Euler(-Math.PI / 2, 0, 0))

export function createViewerStateInitial(): ViewerState {
    return {
        viewType: "2d",
        position: topPosition,
        error: undefined,
        primitiveMap: {},
        result: undefined,
        showBackground: false,
    }
}

export function createViewerStateFunctions(set: SetState<ViewerState>, get: GetState<ViewerState>) {
    return {
        drag: (x: number, y: number) => {
            const state = get()
            if (state.viewType == "2d") {
                const fovSizeOnGround = 2 * Math.tan(FOVinRadians / 2) * state.position[1]
                set({
                    position: [
                        state.position[0] - x * fovSizeOnGround,
                        state.position[1],
                        state.position[2] - y * fovSizeOnGround,
                    ],
                })
            } else {
                euler.set(...state.rotation)
                euler.x = Math.min(Math.max(euler.x + y * FOVinRadians, -Math.PI / 2), Math.PI / 2)
                euler.y += x * FOVinRadians
                set({
                    rotation: [euler.x, euler.y, euler.z],
                })
            }
        },
        zoom: (by: number) => {
            const state = get()
            if (state.viewType != "2d") {
                return
            }
            set({
                position: [state.position[0], Math.max(state.position[1] * by, 0.01), state.position[2]],
            })
        },
        changeView: (state: PanoramaViewerState | TopDownViewerState) => set(state),
        exitPanoramaView: () => {
            const state = get()
            if (state.viewType != "3d") {
                return
            }
            const [x, , z] = calculatePosition(state)
            set({
                viewType: "2d",
                position: [x, 400, z],
            })
        },
        changePanoramaView: (panoramaIndex: number) => {
            const state = get()
            const rotation = state.viewType === "3d" ? state.rotation : panoramaRotation
            set({
                viewType: "3d",
                panoramaIndex,
                rotation,
            })
        },
        setResult: (result: Object3D) => {
            set({ result, error: undefined })
        },
        setError: (error: string) => {
            set({ error })
        },
        addPrimitive: (index: string, primitive: Primitive) => {
            set({
                primitiveMap: produce(get().primitiveMap, (draft) => {
                    draft[index] = primitive
                }),
            })
        },
        removePrimitive: (index: string) => {
            set({
                primitiveMap: produce(get().primitiveMap, (draft) => {
                    delete draft[index]
                }),
            })
        },
        clearPrimitives: () => {
            set({ primitiveMap: {} })
        },
        toggleBackground: () => {
            set({ showBackground: !get().showBackground })
        },
    }
}

export type ViewerStateFunctions = ReturnType<typeof createViewerStateFunctions>

export const useViewerState = create(
    subscribeWithSelector<ViewerState & ViewerStateFunctions>(
        combine(createViewerStateInitial(), createViewerStateFunctions) as any
    )
)

export function calculatePosition(state: ViewerState): Vector3Tuple {
    if (state.viewType === "2d") {
        return state.position
    }
    return panoramas[state.panoramaIndex].position
}

export function calculateRotation(state: ViewerState): Vector3Tuple {
    if (state.viewType === "2d") {
        return topRotation
    }
    return state.rotation
}

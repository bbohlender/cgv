import { Euler, Vector3Tuple } from "three"
import { GetState, SetState } from "zustand"
import { CombineEmpty } from "../../../base-state"
import create from "zustand"
import { combine, subscribeWithSelector } from "zustand/middleware"
import { panoramas } from "../global"
import { Primitive } from "cgv/domains/shape"

export const FOV = 60

const FOVinRadians = (FOV / 180) * Math.PI

export type TopDownViewerState = {
    viewType: "2d"
} & Position

export type Position = {
    lat: number
    lon: number
    height: number
}

export type PanoramaViewerState = {
    viewType: "3d"
    panoramaIndex: number
    rotation: Vector3Tuple
}

export type ResultViewerState = {
    error: string | undefined
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

export const topRotation = eulerToTuple(new Euler(-Math.PI / 2, 0, 0))

export function createViewerStateInitial(): ViewerState {
    return {
        viewType: "2d",
        lat: 0,
        lon: 0,
        height: DEFAULT_CAMERA_HEIGHT,
        error: undefined,
        showBackground: false,
    }
}

const MIN_CAMERA_HEIGHT = 0.0001
const DEFAULT_CAMERA_HEIGHT = 0.001
const MAX_CAMERA_HEIGHT = 0.002

export function createViewerStateFunctions(set: SetState<ViewerState>, get: GetState<ViewerState>) {
    return {
        setPosition: (lat: number, lon: number) => {
            set({
                lat,
                lon,
            })
        },
        drag: (x: number, y: number) => {
            const state = get()
            if (state.viewType == "2d") {
                const fovSizeOnGround = 2 * Math.tan(FOVinRadians / 2) * state.height
                set({
                    lon: state.lon - x * fovSizeOnGround,
                    lat: state.lat - y * fovSizeOnGround,
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
        pinch: (by: number) => {
            const state = get()
            if (state.viewType != "2d") {
                return
            }
            set({
                height: Math.min(Math.max(state.height * by, MIN_CAMERA_HEIGHT), MAX_CAMERA_HEIGHT),
            })
        },
        changeView: (state: PanoramaViewerState | TopDownViewerState) => set(state),
        exitPanoramaView: () => {
            const state = get()
            if (state.viewType != "3d") {
                return
            }
            const { lat, lon } = getPosition(state)
            set({
                viewType: "2d",
                lon,
                lat,
                height: DEFAULT_CAMERA_HEIGHT,
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
        setError: (error: string | undefined) => {
            set({ error })
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

export function getPosition(state: ViewerState): Position {
    if (state.viewType === "2d") {
        return state
    }
    return panoramas[state.panoramaIndex]
}

export function calculateRotation(state: ViewerState): Vector3Tuple {
    if (state.viewType === "2d") {
        return topRotation
    }
    return state.rotation
}

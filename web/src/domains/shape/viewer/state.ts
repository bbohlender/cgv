import { Euler, Vector3Tuple } from "three"
import { GetState, SetState } from "zustand"
import { CombineEmpty } from "../../../base-state"
import create from "zustand"
import { combine, subscribeWithSelector } from "zustand/middleware"
import { panoramas } from "../global"
import { lat2tile, lon2tile, Primitive, tileMeterRatio } from "cgv/domains/shape"

export const FOV = 60

const FOVinRadians = (FOV / 180) * Math.PI

//the position representation in the state all refer to the single tile at zoom 0

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
        position: [0, DEFAULT_Y, 0],
        error: undefined,
        showBackground: false,
    }
}

const GLOBAL_METER_RATIO = tileMeterRatio(0, 0)

const MIN_Y = 1 /*m*/ / GLOBAL_METER_RATIO
const DEFAULT_Y = 10 /*m*/ / GLOBAL_METER_RATIO
const MAX_Y = 40 /*m*/ / GLOBAL_METER_RATIO

export function clip(v: number, min: number, max: number) {
    return Math.min(Math.max(v, min), max)
}

export function createViewerStateFunctions(set: SetState<ViewerState>, get: GetState<ViewerState>) {
    return {
        setLatLon: (lat: number, lon: number) => {
            set({
                viewType: "2d",
                position: [lon2tile(lon, 0), DEFAULT_Y, lat2tile(lat, 0)],
            })
        },
        drag: (xDrag: number, zDrag: number) => {
            const state = get()
            if (state.viewType == "2d") {
                const [x, y, z] = state.position
                const fovSizeOnGround = 2 * Math.tan(FOVinRadians / 2) * state.position[1]
                set({
                    position: [clip(x - xDrag * fovSizeOnGround, 0, 1), y, clip(z - zDrag * fovSizeOnGround, 0, 1)],
                })
            } else {
                euler.set(...state.rotation)
                euler.x = clip(euler.x + zDrag * FOVinRadians, -Math.PI / 2, Math.PI / 2)
                euler.y += xDrag * FOVinRadians
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
            const [x, y, z] = state.position
            set({
                position: [x, clip(y * by, MIN_Y, MAX_Y), z],
            })
        },
        changeView: (state: PanoramaViewerState | TopDownViewerState) => set(state),
        exitPanoramaView: () => {
            const state = get()
            if (state.viewType != "3d") {
                return
            }
            const [x, y, z] = getPosition(state)
            set({
                viewType: "2d",
                position: [x, DEFAULT_Y, z],
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

export function getPosition(state: ViewerState): Vector3Tuple {
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

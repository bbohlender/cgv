import { Euler, Vector3, Vector3Tuple } from "three"
import { GetState, SetState } from "zustand"
import { CombineEmpty, CombineEmpty3 } from "../../../base-state"
import create from "zustand"
import { combine, subscribeWithSelector } from "zustand/middleware"
import { panoramas } from "../global"
import { lat2tile, lon2tile, Primitive, tileMeterRatio } from "cgv/domains/shape"
import { locations } from "../geo-search"

export const FOV = 60

//the position representation in the state all refer to the single tile at zoom 0

export type SateliteViewerState = {
    viewType: "satelite"
    position: Vector3Tuple
}

export type PanoramaViewerState = {
    viewType: "panorama"
    panoramaIndex: number
    rotation: Vector3Tuple
    fov: number
}

export type FlyViewerState = {
    viewType: "fly"
    position: Vector3Tuple
    rotation: Vector3Tuple
}

export type ResultViewerState = {
    error: string | undefined
}

export type PrimitiveMap = { [Key in string]: Primitive }

export type ViewerState = (
    | CombineEmpty3<SateliteViewerState, PanoramaViewerState, FlyViewerState>
    | CombineEmpty3<PanoramaViewerState, SateliteViewerState, FlyViewerState>
    | CombineEmpty3<FlyViewerState, PanoramaViewerState, SateliteViewerState>
) &
    ResultViewerState & {
        visualType: number
        controlling: boolean
    }

export function eulerToTuple(q: Euler): Vector3Tuple {
    return [q.x, q.y, q.z]
}

const euler = new Euler(0, 0, 0, "YXZ")
const panoramaRotation: Vector3Tuple = [0, 0, 0]

export const topRotation = eulerToTuple(new Euler(-Math.PI / 2, 0, 0))

const GLOBAL_METER_RATIO = tileMeterRatio(0, 0)

const MIN_Y_FLY_CAMERA = 0.1 /*m*/ / GLOBAL_METER_RATIO
const MIN_Y = 1 /*m*/ / GLOBAL_METER_RATIO
const DEFAULT_Y = 10 /*m*/ / GLOBAL_METER_RATIO
const MAX_Y = 40 /*m*/ / GLOBAL_METER_RATIO

const MIN_FOV = 5 //degree
const MAX_FOV = 120 //degree

export function createViewerStateInitial(): ViewerState {
    return {
        viewType: "satelite",
        position: [lon2tile(locations[0].lon, 0), DEFAULT_Y, lat2tile(locations[0].lat, 0)],
        error: undefined,
        visualType: 0.5,
        controlling: false,
    }
}

export function getForegroundOpacity(visualType: number): number {
    return Math.min(visualType * 2 - 1, 1)
}

export function getBackgroundOpacity(visualType: number): number {
    return Math.max(visualType * 2, 0)
}

export function clip(v: number, min: number, max: number) {
    return Math.min(Math.max(v, min), max)
}

export function createViewerStateFunctions(set: SetState<ViewerState>, get: GetState<ViewerState>) {
    return {
        setControlling: (controlling: boolean) => set({ controlling }),
        setLatLon: (lat: number, lon: number) => {
            set({
                viewType: "satelite",
                position: [lon2tile(lon, 0), DEFAULT_Y, lat2tile(lat, 0)],
            })
        },
        drag: (xDrag: number, zDrag: number) => {
            const state = get()
            const FOVinRadians = (calculateFOV(state) / 180) * Math.PI
            switch (state.viewType) {
                case "panorama":
            }
            if (state.viewType == "satelite") {
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
        moveFlyCamera: (by: Vector3Tuple) => {
            const state = get()
            if (state.viewType !== "fly") {
                return
            }
            set({
                position: computeFlyCameraPosition(state.position, by, state.rotation),
            })
        },
        pinch: (by: number) => {
            const state = get()
            switch (state.viewType) {
                case "satelite":
                    {
                        const [x, y, z] = state.position
                        set({
                            position: [x, clip(y / by, MIN_Y, MAX_Y), z],
                        })
                    }
                    break
                case "panorama":
                    {
                        const fov = clip(state.fov / ((2 + by) / 3), MIN_FOV, MAX_FOV)
                        set({
                            fov,
                        })
                    }
                    break
                case "fly": {
                    set({
                        position: computeFlyCameraPosition(state.position, [0, 0, (1 - by) * 0.000001], state.rotation),
                    })
                }
            }
        },
        changeView: (state: PanoramaViewerState | SateliteViewerState | FlyViewerState) => set(state),
        enterFlyCamera: () => {
            const state = get()
            if (state.viewType === "fly") {
                return
            }
            const position = getPosition(state)
            const rotation = calculateRotation(state)
            set({
                viewType: "fly",
                position,
                rotation,
            })
        },
        backToSateliteView: () => {
            const state = get()
            if (state.viewType === "satelite") {
                return
            }
            const [x, y, z] = getPosition(state)
            set({
                viewType: "satelite",
                position: [x, clip(y, MIN_Y, MAX_Y), z],
            })
        },
        changePanoramaView: (panoramaIndex: number) => {
            const state = get()
            const rotation = state.viewType === "satelite" ? panoramaRotation : state.rotation
            const fov = state.viewType === "panorama" ? state.fov : FOV
            set({
                viewType: "panorama",
                panoramaIndex,
                rotation,
                fov,
            })
        },
        setError: (error: string | undefined) => {
            set({ error })
        },
        setVisualType: (visualType: number) => {
            set({ visualType })
        },
    }
}

const helperVector = new Vector3()
const helperEuler = new Euler(undefined, undefined, undefined, "YXZ")

function computeFlyCameraPosition([x, y, z]: Vector3Tuple, move: Vector3Tuple, rotation: Vector3Tuple): Vector3Tuple {
    helperVector.set(...move)
    helperEuler.set(...rotation)
    helperVector.applyEuler(helperEuler)
    helperVector.x += x
    helperVector.y += y
    helperVector.z += z
    helperVector.y = clip(helperVector.y, MIN_Y_FLY_CAMERA, MAX_Y)
    return helperVector.toArray()
}

export type ViewerStateFunctions = ReturnType<typeof createViewerStateFunctions>

export const useViewerState = create(
    subscribeWithSelector<ViewerState & ViewerStateFunctions>(
        combine(createViewerStateInitial(), createViewerStateFunctions) as any
    )
)

export function getPosition(state: ViewerState): Vector3Tuple {
    if (state.viewType !== "panorama") {
        return state.position
    }
    return panoramas[state.panoramaIndex].position
}

export function calculateRotation(state: ViewerState): Vector3Tuple {
    if (state.viewType === "satelite") {
        return topRotation
    }
    return state.rotation
}

export function calculateFOV(state: ViewerState): number {
    if (state.viewType === "panorama") {
        return state.fov
    }
    return FOV
}

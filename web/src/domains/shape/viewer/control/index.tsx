import { getSelectedStepsJoinedPath, SelectedSteps } from "cgv"
import { tileMeterRatio, tileZoomRatio } from "cgv/domains/shape"
import { useCallback, useMemo } from "react"
import { useBaseStore } from "../../../../global"
import { MultiplePointControl } from "./multiple-points"
import { Point2Control, Point3Control } from "./point"

export function worldToTileMeter(x: number, y: number, result: { x: number; y: number; z: number }): void {
    const zoomRatio = tileZoomRatio(0, 18)
    const meterRatio = tileMeterRatio(y, 18)
    result.x = (result.x * zoomRatio - x) * meterRatio
    result.y = result.y * zoomRatio * meterRatio
    result.z = (result.z * zoomRatio - y) * meterRatio
}

export function tileMeterToWorld(x: number, y: number, result: { x: number; y: number; z: number }): void {
    const ratio = tileZoomRatio(18, 0)
    const meterRatio = tileMeterRatio(y, 18)
    result.x = (result.x / meterRatio + x) * ratio
    result.y = (result.y / meterRatio) * ratio
    result.z = (result.z / meterRatio + y) * ratio
}

export function Control() {
    const store = useBaseStore()
    const selectionsList = store((state) =>
        state.type === "gui" && state.requested == null ? state.selectionsList : undefined
    )
    if (selectionsList == null) {
        return null
    }
    return (
        <>
            {selectionsList.map((selections) => (
                <OperationControl key={getSelectedStepsJoinedPath(selections.steps)} value={selections.steps} />
            ))}
        </>
    )
}

function nopFn<T>(val: T): T {
    return val
}

function OperationControl({ value }: { value: SelectedSteps }) {
    if (typeof value == "string" || value.type != "operation") {
        return null
    }
    const valueRef = useMemo(() => ({ current: value }), [])
    valueRef.current = value
    switch (value.identifier) {
        case "point3":
            return <Point3Control valueRef={valueRef} getSubstep={nopFn} substepValue={value} />
        case "point2":
            return <Point2Control valueRef={valueRef} getSubstep={nopFn} substepValue={value} />
        case "face":
        case "line":
            return <MultiplePointControl valueRef={valueRef} value={value} />
        default:
            return null
    }
}

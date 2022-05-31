import {
    AbstractParsedOperation,
    FullValue,
    getSelectedStepsJoinedPath,
    HierarchicalInfo,
    HierarchicalParsedSteps,
    ParsedOperation,
    ParsedSteps,
    SelectedSteps,
} from "cgv"
import { Axis, makeTranslationMatrix, Primitive, tileMeterRatio, tileZoomRatio } from "cgv/domains/shape"
import { Draft } from "immer"
import { useCallback, useMemo } from "react"
import { Box3, Matrix4, Vector3, Vector3Tuple } from "three"
import { useBaseStore } from "../../../../global"
import { MultiplePointControl } from "./multiple-points"
import { Point2Control, Point3Control } from "./point"
import { AxisEnabled, TransformControl } from "./transform-control"

const axisY: AxisEnabled = [false, true, false]

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
                <OperationControl
                    values={selections.values}
                    key={getSelectedStepsJoinedPath(selections.steps)}
                    step={selections.steps}
                />
            ))}
        </>
    )
}

function nopFn<T>(val: T): T {
    return val
}

function OperationControl({ step, values }: { values: Array<FullValue<any, any>>; step: SelectedSteps }) {
    if (typeof step == "string" || step.type != "operation") {
        return null
    }
    const primitiveValues = values
        .map(({ before }) => before.raw)
        .filter((value, index, self) => self.indexOf(value) === index) //distinct
        .filter(isPrimitive)
    const valueRef = useMemo(() => ({ current: step }), [])
    valueRef.current = step
    switch (step.identifier) {
        case "point3":
            return (
                <>
                    {primitiveValues.map((value, i) => (
                        <Point3Control
                            key={i}
                            matrix={value.matrix}
                            valueRef={valueRef}
                            getSubstep={nopFn}
                            substepValue={step}
                        />
                    ))}
                </>
            )
        case "point2":
            return (
                <>
                    {primitiveValues.map((value, i) => (
                        <Point2Control
                            key={i}
                            matrix={value.matrix}
                            valueRef={valueRef}
                            getSubstep={nopFn}
                            substepValue={step}
                        />
                    ))}
                </>
            )
        case "face":
        case "line":
            return (
                <>
                    {primitiveValues.map((value, i) => (
                        <MultiplePointControl key={i} matrix={value.matrix} valueRef={valueRef} value={step} />
                    ))}
                </>
            )
        case "split":
            return (
                <>
                    {primitiveValues.map((value, i) => (
                        <SplitControl key={i} value={value} step={step} />
                    ))}
                </>
            )
        case "extrude":
            return (
                <>
                    {primitiveValues.map((value, i) => (
                        <ExtrudeControl key={i} value={value} step={step} />
                    ))}
                </>
            )
        default:
            return null
    }
}

function isPrimitive(val: any): val is Primitive {
    return val instanceof Primitive
}

const boxHelper = new Box3()
const vectorHelper = new Vector3()

export function SplitControl({ value, step }: { step: AbstractParsedOperation<HierarchicalInfo>; value: Primitive }) {
    const store = useBaseStore()

    const axis: Axis = step.children[0].type === "raw" ? step.children[0].value : "x"
    const axisIndex = axisIndexMap[axis]

    const sizes = new Array<number>(step.children.length - 2)
    const offsets = new Array<number>(step.children.length - 2)

    let sum = 0
    for (let i = 0; i < step.children.length - 2; i++) {
        const child = step.children[i + 2]
        const size = child.type === "raw" ? child.value : 0
        sizes[i] = size
        offsets[i] = sum
        sum += size
    }

    return (
        <>
            {sizes.map((size, i) => {
                const position: Vector3Tuple = [0, 0, 0]
                position[axisIndex] = size + offsets[i]
                return (
                    <TransformControl
                        value={position}
                        axes={axisMap[axis]}
                        matrix={value.matrix}
                        set={(newPosition) =>
                            store.getState().replace<"operation">((draft) => {
                                draft.children[i + 2] = {
                                    type: "raw",
                                    value: newPosition[axisIndex] - offsets[i],
                                }
                            }, step)
                        }
                    />
                )
            })}
        </>
    )
}

const axisIndexMap: { [axis in Axis]: number } = {
    x: 0,
    y: 1,
    z: 2,
}

const axisMap: { [axis in Axis]: [boolean, boolean, boolean] } = {
    x: [true, false, false],
    y: [false, true, false],
    z: [false, false, true],
}

export function ExtrudeControl({ value, step }: { step: AbstractParsedOperation<HierarchicalInfo>; value: Primitive }) {
    const store = useBaseStore()

    const extrusion = step.children[0].type === "raw" ? step.children[0].value : 0

    const [x, y, z] = useMemo(() => {
        value.getBoundingBox(boxHelper)
        boxHelper.getCenter(vectorHelper)
        return vectorHelper.toArray()
    }, [value])

    const clonedOutline = useMemo(() => {
        const outline = value.getOutline().clone()
        outline.matrix.copy(makeTranslationMatrix(-x, -y, -z))
        return outline
    }, [value])

    const set = useCallback(
        () =>
            ([x, extrusionAndY, z]: Vector3Tuple) =>
                store.getState().replace((draft) => {
                    draft.children = [
                        {
                            type: "raw",
                            value: extrusionAndY - y,
                        },
                    ]
                }, step),
        [step, y]
    )

    return (
        <TransformControl
            value={[x, extrusion + y, z]}
            axes={axisY}
            matrix={value.matrix}
            child={clonedOutline}
            set={set}
        />
    )
}

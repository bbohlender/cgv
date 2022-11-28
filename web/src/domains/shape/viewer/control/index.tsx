import {
    AbstractParsedOperation,
    FullValue,
    getSelectedStepsJoinedPath,
    getSelectedStepsPath,
    HierarchicalInfo,
    isNounOfDescription,
    SelectedSteps,
    shallowEqual,
} from "cgv"
import { Axis, makeScaleMatrix, makeTranslationMatrix, Primitive } from "cgv/domains/shape"
import { useEffect, useMemo, useRef } from "react"
import { Box3, Matrix4, Object3D, Vector3, Vector3Tuple } from "three"
import { UseBaseStore, useBaseStore } from "../../../../global"
import { MultiplePointControl } from "./multiple-points"
import { Point2Control, Point3Control } from "./point"
import { AxisEnabled, TransformControl } from "./transform-control"

const axisY: AxisEnabled = [false, true, false]
const allAxis: AxisEnabled = [true, true, true]

export function Control({ description }: { description: string }) {
    const store = useBaseStore()
    const selectionsList = store(
        (state) =>
            state.type === "gui" && state.requested == null
                ? state.selectionsList.filter((selections) =>
                      isNounOfDescription(description, getSelectedStepsPath(selections.steps)[0])
                  )
                : undefined,
        shallowEqual
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

function OperationControl({ step, values }: { values: Array<FullValue<any>>; step: SelectedSteps }) {
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
        case "translate":
            return (
                <>
                    {primitiveValues.map((value, i) => (
                        <TranslateControl key={i} value={value} step={step} />
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
    const axisEnabled = axisMap[axis]

    const splitAmount = step.children.length - 2

    const sizes = new Array<number>(splitAmount)
    const offsets = new Array<number>(splitAmount)

    const [x, y, z] = useMemo(() => {
        value.getBoundingBox(boxHelper)
        boxHelper.getCenter(vectorHelper)
        vectorHelper[axis] = boxHelper.min[axis]
        return vectorHelper.toArray()
    }, [value])

    const clonedOutline = useMemo(() => {
        const outline = value.getOutline().clone()
        outline.matrix.copy(makeTranslationMatrix(-x, -y, -z))
        const scale: Vector3Tuple = [1, 1, 1]
        scale[axisIndex] = 0
        outline.matrix.multiply(makeScaleMatrix(...scale))
        return outline
    }, [value, axisIndex, x, y, z])

    let sum = 0
    for (let i = 0; i < step.children.length - 2; i++) {
        const child = step.children[i + 2]
        const size = child.type === "raw" ? child.value : 0
        sizes[i] = size
        offsets[i] = sum
        sum += size
    }

    const clones = useRef<Array<Object3D>>([])

    useEffect(() => {
        while (clones.current.length < splitAmount) {
            clones.current.push(clonedOutline.clone())
        }
        clones.current.splice(splitAmount, Number.MAX_SAFE_INTEGER)
    }, [clonedOutline, splitAmount])

    return (
        <>
            {sizes.map((size, i) => (
                <SingleSplitControl
                    index={i}
                    axisEnabled={axisEnabled}
                    axisIndex={axisIndex}
                    matrix={value.matrix}
                    offset={offsets[i]}
                    outline={clonedOutline}
                    size={size}
                    step={step}
                    store={store}
                    x={x}
                    y={y}
                    z={z}
                    key={i}
                />
            ))}
        </>
    )
}

function SingleSplitControl({
    size,
    offset,
    x,
    y,
    z,
    axisEnabled,
    axisIndex,
    matrix,
    outline,
    store,
    step,
    index,
}: {
    index: number
    step: SelectedSteps
    store: UseBaseStore
    matrix: Matrix4
    outline: Object3D
    axisIndex: number
    axisEnabled: AxisEnabled
    size: number
    offset: number
    x: number
    y: number
    z: number
}) {
    const clonedOutline = useMemo(() => outline.clone(), [outline])
    return useMemo(() => {
        const position: Vector3Tuple = [x, y, z]
        position[axisIndex] += size + offset
        return (
            <TransformControl
                length={0.3}
                value={position}
                axis={axisEnabled}
                matrix={matrix}
                depth={true}
                child={clonedOutline}
                mode="translate"
                set={(...newPosition) =>
                    store.getState().edit<"operation">({
                        mode: "replace",
                        steps: step,
                        stepGenerator: (path, draft) => {
                            draft.children[index + 2] = {
                                type: "raw",
                                value: Math.max(0, newPosition[axisIndex] - offset),
                            }
                        },
                    })
                }
            />
        )
    }, [index, size, offset, x, y, z, axisEnabled, axisIndex, matrix, clonedOutline, store, step])
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
    }, [value, x, y, z])

    return (
        <TransformControl
            value={[x, extrusion + y, z]}
            axis={axisY}
            matrix={value.matrix}
            mode="translate"
            child={clonedOutline}
            set={(x, extrusionAndY, z) =>
                store.getState().edit({
                    mode: "replace",
                    steps: step,
                    stepGenerator: (path, draft) => {
                        draft.children = [
                            {
                                type: "raw",
                                value: extrusionAndY - y,
                            },
                        ]
                    },
                })
            }
        />
    )
}

export function TranslateControl({
    value,
    step,
}: {
    step: AbstractParsedOperation<HierarchicalInfo>
    value: Primitive
}) {
    const store = useBaseStore()

    const x = step.children[0].type === "raw" ? step.children[0].value : 0
    const y = step.children[1].type === "raw" ? step.children[1].value : 0
    const z = step.children[2].type === "raw" ? step.children[2].value : 0

    const [xCenter, yCenter, zCenter] = useMemo(() => {
        value.getBoundingBox(boxHelper)
        boxHelper.getCenter(vectorHelper)
        return vectorHelper.toArray()
    }, [value])

    const clonedOutline = useMemo(() => {
        const outline = value.getOutline().clone()
        outline.matrix.copy(makeTranslationMatrix(-xCenter, -yCenter, -zCenter))
        return outline
    }, [value, xCenter, yCenter, zCenter])

    return (
        <TransformControl
            value={[xCenter + x, yCenter + y, zCenter + z]}
            axis={allAxis}
            matrix={value.matrix}
            mode="translate"
            child={clonedOutline}
            set={(x, y, z) =>
                store.getState().edit({
                    mode: "replace",
                    stepGenerator: (path, draft) => {
                        draft.children = [
                            {
                                type: "raw",
                                value: x - xCenter,
                            },
                            {
                                type: "raw",
                                value: y - yCenter,
                            },
                            {
                                type: "raw",
                                value: z - zCenter,
                            },
                        ]
                    },
                    steps: step,
                })
            }
        />
    )
}

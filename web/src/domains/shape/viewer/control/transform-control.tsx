import { Plane, TransformControls } from "@react-three/drei"
import { createPortal, useThree } from "@react-three/fiber"
import { useRef, useEffect, useMemo, useState } from "react"
import {
    Camera,
    Color,
    DoubleSide,
    Euler,
    Group,
    Matrix4,
    Object3D,
    PlaneBufferGeometry,
    Vector3,
    Vector3Tuple,
} from "three"
import { Draggable } from "./draggable"

export type TransformMode = "scale" | "rotate" | "translate"
export type AxisEnabled = [boolean, boolean, boolean]

const planeGeometry = new PlaneBufferGeometry(1, 1)
planeGeometry.translate(0.5, 0.5, 0)

const axisAxis: Array<AxisEnabled> = [
    [true, false, false],
    [false, true, false],
    [false, false, true],
]
const axisColor = [new Color(1, 0, 0), new Color(0, 1, 0), new Color(0, 0, 1)]
const axisDirection = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]

const planeAxis: Array<AxisEnabled> = [
    [true, true, false],
    [true, false, true],
    [false, true, true],
]
const planeColor = [new Color(1, 1, 0), new Color(0, 1, 1), new Color(0, 1, 1)]
const planeRotation = [
    new Euler(0, 0, 0), //XY
    new Euler(Math.PI / 2, 0, 0), //XZ
    new Euler(Math.PI / 2, 0, 0), //YZ
]

function getPlanes([x, y, z]: AxisEnabled): Array<boolean> {
    return [x && y, x && z, x && y]
}

export function TransformControl({
    set,
    value,
    matrix,
    axes,
    child,
}: {
    value: Vector3Tuple
    matrix: Matrix4
    axes: AxisEnabled
    set: (position: Vector3Tuple) => void
    child?: Object3D
}) {
    const [position, setPosition] = useState<Vector3Tuple>(value)
    console.log(position)
    useEffect(() => {
        setPosition(value)
    }, [value])
    return (
        <group renderOrder={1000} matrix={matrix} matrixAutoUpdate={false}>
            {axes.map((axis, i) =>
                axis ? (
                    <Draggable
                        key={i}
                        axis={axisAxis[i]}
                        onStopDrag={() => {}}
                        position={position}
                        set={(position) => setPosition(position)}>
                        <arrowHelper args={[axisDirection[i], undefined, undefined, axisColor[i]]} />
                        {child && <primitive object={child} />}
                    </Draggable>
                ) : null
            )}
            {getPlanes(axes).map((plane, i) =>
                plane ? (
                    <Draggable
                        key={i}
                        axis={planeAxis[i]}
                        onStopDrag={() => {}}
                        position={position}
                        set={(position) => setPosition(position)}>
                        <mesh scale={0.5} rotation={planeRotation[i]} geometry={planeGeometry}>
                            <meshBasicMaterial side={DoubleSide} color={planeColor[i]} />
                        </mesh>
                        {child && <primitive object={child} />}
                    </Draggable>
                ) : null
            )}
        </group>
    )
}

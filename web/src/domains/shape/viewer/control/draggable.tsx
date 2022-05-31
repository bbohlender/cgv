import { useThree, useFrame, Camera, RootState } from "@react-three/fiber"
import { shallowEqual } from "cgv"
import { TransformControls } from "three-stdlib"
import { PropsWithChildren, useEffect, useRef } from "react"
import { Group, Matrix4, Mesh, PerspectiveCamera, Vector3, Vector3Tuple } from "three"

const vector3Helper = new Vector3()
const moveHelper = new Vector3()
const positionHelper = new Vector3()
const axesVectors = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]

function cameraAndDomElement({ camera, gl }: RootState): [Camera, HTMLCanvasElement] {
    return [camera, gl.domElement]
}

const matrixHelper = new Matrix4()

export function Draggable({
    set,
    axis,
    onStopDrag,
    position,
    children,
}: PropsWithChildren<{
    onStopDrag: () => void
    set: (position: Vector3Tuple) => void
    position: Vector3Tuple
    axis: [boolean, boolean, boolean]
}>): JSX.Element {
    const grabbedRef = useRef<Vector3 | undefined>(undefined)
    const groupRef = useRef<Group>(null)

    const [camera, domElement] = useThree(cameraAndDomElement, shallowEqual)

    useFrame(({ mouse }) => {
        if (grabbedRef.current == null || groupRef.current == null) {
            return
        }

        matrixHelper.copy(groupRef.current.matrix).invert()
        moveHelper.set(0, 0, 0)
        positionHelper.set(...position)

        for (let i = 0; i < 3; i++) {
            if (!axis[i]) {
                continue
            }

            screenToGroupSpace(vector3Helper, mouse.x, mouse.y, camera, matrixHelper).sub(grabbedRef.current) //vector: grabStart -> current

            const moveInAxis = vector3Helper.dot(axesVectors[i])
            moveHelper.setComponent(i, moveInAxis)
        }

        if (moveHelper.x === 0 && moveHelper.y === 0 && moveHelper.z === 0) {
            //no changes
            return
        }

        positionHelper.add(moveHelper)
        //add position

        set(positionHelper.toArray()) //update
    })

    useEffect(() => {
        const stopDrag = () => {
            if (!grabbedRef.current) {
                return
            }
            grabbedRef.current = undefined
            onStopDrag()
        }
        domElement.addEventListener("pointerup", stopDrag)
        domElement.addEventListener("pointerleave", stopDrag)
        return () => {
            domElement.removeEventListener("pointerup", stopDrag)
            domElement.removeEventListener("pointerleave", stopDrag)
        }
    }, [domElement, onStopDrag])

    return (
        <group
            ref={groupRef}
            onPointerDown={(e) => {
                if (groupRef.current == null) {
                    return
                }
                e.stopPropagation()
                grabbedRef.current = new Vector3()
                matrixHelper.copy(groupRef.current.matrix).invert()
                screenToGroupSpace(grabbedRef.current, e.pointer.x, e.pointer.y, camera, matrixHelper)
            }}>
            <group position={position}>{children}</group>
        </group>
    )
}

function screenToGroupSpace(
    target: Vector3,
    x: number,
    y: number,
    camera: Camera,
    groupMatrixInverse: Matrix4
): Vector3 {
    return target
        .set(x, y, 0) //screen space
        .applyMatrix4(camera.projectionMatrixInverse) //camera space
        .applyMatrix4(camera.matrixWorldInverse) //global space
        .applyMatrix4(groupMatrixInverse) //group space
}

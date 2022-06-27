import { MeshProps, useThree } from "@react-three/fiber"
import { PropsWithChildren, useMemo } from "react"
import { BufferAttribute, BufferGeometry } from "three"

function createScreenQuadGeometry() {
    const geometry = new BufferGeometry()
    const vertices = new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0])
    const uv = new Float32Array([-1, -1, 3, -1, -1, 3])
    geometry.setAttribute("position", new BufferAttribute(vertices, 3))
    geometry.setAttribute("uv", new BufferAttribute(uv, 2))
    return geometry
}

export function Display({ children, ...props }: PropsWithChildren<MeshProps>) {
    const geometry = useMemo(createScreenQuadGeometry, [])
    const { width, height } = useThree(({ size }) => size)
    return (
        <mesh
            scale-x={width / height}
            position={[(-0.5 * width) / height, -0.5, -0.86]}
            geometry={geometry}
            frustumCulled={false}
            {...props}>
            {children}
        </mesh>
    )
}

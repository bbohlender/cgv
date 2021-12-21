import { Instance } from "cgv/domains/shape"

export function Scene({ instances }: { instances: Array<Instance> }) {
    return (
        <group scale={0.01}>
            {instances.map((instance, i) => (
                <primitive key={i} object={instance.primitive.getObject3D(true)} />
            ))}
        </group>
    )
}

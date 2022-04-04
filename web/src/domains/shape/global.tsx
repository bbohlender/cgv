import { Vector3Tuple } from "three"

export const panoramas: Array<{ url: string; position: Vector3Tuple; rotationOffset: number }> = [
    {
        position: [0, 2, 0],
        url: "/cgv/panorama-1.jpg",
        rotationOffset: 0,
    },
    {
        position: [-6.356732023711336, 2, -7.341277377555825],
        url: "/cgv/panorama-2.jpg",
        rotationOffset: Math.PI / 2,
    },
    {
        position: [-6.357632544002161, 2, 8.817223061904349],
        url: "/cgv/panorama-3.jpg",
        rotationOffset: Math.PI / 2,
    },
    {
        position: [-12.685182954572484, 2, -0.9930769947840974],
        url: "/cgv/panorama-4.jpg",
        rotationOffset: 0,
    },
]

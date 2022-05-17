import { Position } from "./viewer/state"

export const panoramas: Array<{ url: string; rotationOffset: number } & Position> = [
    {
        lon: 0,
        lat: 0,
        height: 20,
        url: "/cgv/panorama-1.jpg",
        rotationOffset: 0,
    },
    {
        lon: -63.56732023711336,
        lat: -73.41277377555825,
        height: 20,
        url: "/cgv/panorama-2.jpg",
        rotationOffset: Math.PI / 2,
    },
    {
        lon: -63.57632544002161,
        lat: 88.17223061904349,
        height: 20,
        url: "/cgv/panorama-3.jpg",
        rotationOffset: Math.PI / 2,
    },
    {
        lon: -126.85182954572484,
        lat: -9.930769947840974,
        height: 20,
        url: "/cgv/panorama-4.jpg",
        rotationOffset: 0,
    },
]

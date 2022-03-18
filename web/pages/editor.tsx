export default function Editor() {
    return (
        <div className="d-flex responsive-flex-direction" style={{ width: "100vw", height: "100vh" }}>
            <div className="flex-grow-1"></div>
            <div style={{ overflowX: "hidden", overflowY: "auto" }} className="flex-grow-1 bg-dark"></div>
        </div>
    )
}

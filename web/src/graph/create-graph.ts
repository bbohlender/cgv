import { HierarchicalParsedGrammarDefinition, HierarchicalParsedSteps } from "cgv"
import { graphlib, layout } from "dagre"
import { Edge, Node, Position } from "react-flow-renderer"
import { childrenSelectable, OperationGUIMap } from "../gui"

export function createGraph(
    nodes: Array<Node>,
    edges: Array<Edge>,
    description: HierarchicalParsedGrammarDefinition,
    descriptionName: string,
    operationGuiMap: OperationGUIMap
): void {
    const graph = new graphlib.Graph()
    graph.setGraph({ rankdir: "LR" })
    for (const noun of description) {
        const id = `noun-${noun.name}`

        nodes.push({
            data: { noun, descriptionName },
            type: "noun",
            id,
            position: { x: 0, y: 0 },
            connectable: false,
            selectable: false,
            draggable: false,
        })

        graph.setNode(id, {
            width: 200,
            height: 40,
        })
        createGraphNode(nodes, edges, graph, noun.step, descriptionName, id, "next", "main", [], operationGuiMap)
    }
    layout(graph)
    for (const node of nodes) {
        const { x, y, width, height } = graph.node(node.id)
        node.targetPosition = Position.Left
        node.sourcePosition = Position.Right
        node.position.x = x - width / 2
        node.position.y = y - height / 2
        //node.width = width
        //node.height = height
    }
}

function createGraphNode(
    nodes: Array<Node>,
    edges: Array<Edge>,
    graph: graphlib.Graph,
    step: HierarchicalParsedSteps,
    descriptionName: string,
    parentId: string,
    sourceHandleId: string,
    edgeType: "main" | "child",
    next: Array<HierarchicalParsedSteps>,
    operationGuiMap: OperationGUIMap
): void {
    if (step.type === "sequential") {
        createGraphNode(
            nodes,
            edges,
            graph,
            step.children[0],
            descriptionName,
            parentId,
            sourceHandleId,
            "main",
            step.children.slice(1).concat(next),
            operationGuiMap
        )
        return
    }

    if (step.type === "parallel") {
        for (const child of step.children) {
            createGraphNode(
                nodes,
                edges,
                graph,
                child,
                descriptionName,
                parentId,
                sourceHandleId,
                "main",
                next,
                operationGuiMap
            )
        }
        return
    }

    const id = step.path.join(",")

    if (parentId != null && sourceHandleId != null) {
        //edge to parent
        graph.setEdge(parentId, id, {})
        edges.push({
            id: getEdgeId(parentId, id),
            sourceHandle: sourceHandleId,
            source: parentId,
            target: id,
            animated: true,
            style: edgeType === "main" ? { stroke: "#88f", strokeWidth: 4 } : { stroke: "#999", strokeWidth: 2 },
        })
    }

    nodes.push({
        data: { step, descriptionName, operationGuiMap },
        type: "step",
        id,
        position: { x: 0, y: 0 },
        connectable: false,
        selectable: false,
        draggable: false,
    })

    graph.setNode(id, {
        width: 200,
        height: 40,
    })

    if (next.length > 0) {
        createGraphNode(
            nodes,
            edges,
            graph,
            next[0],
            descriptionName,
            id,
            "next",
            "main",
            next.slice(1),
            operationGuiMap
        )
    }

    if (step.children == null || !childrenSelectable(operationGuiMap, step)) {
        return
    }

    for (let i = 0; i < step.children.length; i++) {
        createGraphNode(
            nodes,
            edges,
            graph,
            step.children[i],
            descriptionName,
            id,
            i.toString(),
            "child",
            [],
            operationGuiMap
        )
    }
}

function getEdgeId(sourceId: string, targetId: string): string {
    return `${sourceId}-${targetId}`
}

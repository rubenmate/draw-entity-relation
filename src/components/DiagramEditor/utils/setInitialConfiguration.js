import { mxClient, mxEdgeHandler, mxRubberband, mxUtils } from "mxgraph-js";
import initToolbar from "./initToolbar";

export default function setInitialConfiguration(graph, diagramRef, toolbarRef) {
    if (!mxClient.isBrowserSupported()) {
        // Displays an error message if the browser is not supported.
        mxUtils.error("Browser is not supported!", 200, false);
    } else {
        initToolbar(graph, diagramRef, toolbarRef.current);

        // Enables rubberband selection
        new mxRubberband(graph);

        // Enables tooltips, new connections and panning
        graph.setPanning(true);
        graph.setTooltips(true);
        graph.setConnectable(true);
        graph.setEnabled(true);
        graph.setEdgeLabelsMovable(false);
        graph.setVertexLabelsMovable(false);
        graph.setGridEnabled(true);
        graph.setAllowDanglingEdges(false);

        mxEdgeHandler.prototype.addEnabled = true;

        graph.getModel().beginUpdate();
        try {
            //mxGraph component
            const doc = mxUtils.createXmlDocument();
            const node = doc.createElement("Node");
            node.setAttribute("ComponentID", "[P01]");

            // NOTE: Examples on how to add elements to the canvas
            // const vx = graph.insertVertex(
            //     parent,
            //     null,
            //     node,
            //     240,
            //     40,
            //     150,
            //     30,
            //     "shape=ellipse;fillColor=yellow"
            // );
            // const v1 = graph.insertVertex(
            //     parent,
            //     null,
            //     "shape1",
            //     20,
            //     120,
            //     80,
            //     30,
            //     "rounded=1;strokeColor=red;fillColor=orange"
            // );
            // const v2 = graph.insertVertex(parent, null, "shape2", 300, 120, 80, 30);
            // const v3 = graph.insertVertex(parent, null, "shape3", 620, 180, 80, 30);
            // const e1 = graph.insertEdge(
            //     parent,
            //     null,
            //     "",
            //     v1,
            //     v2,
            //     "strokeWidth=2;endArrow=block;endSize=2;endFill=1;strokeColor=blue;rounded=1;"
            // );
            // const e2 = graph.insertEdge(parent, null, "Edge 2", v2, v3);
            // const e3 = graph.insertEdge(parent, null, "Edge 3", v1, v3);
        } finally {
            // Updates the display
            graph.getModel().endUpdate();
        }
    }
}

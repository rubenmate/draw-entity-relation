import {
    mxRubberband,
    mxKeyHandler,
    mxClient,
    mxUtils,
    mxEdgeHandler
} from "mxgraph-js";
import initToolbar from "./initToolbar";

export default function setInitialConfiguration(graph, toolbarRef) {
    if (!mxClient.isBrowserSupported()) {
        // Displays an error message if the browser is not supported.
        mxUtils.error("Browser is not supported!", 200, false);
    } else {
        initToolbar(graph, toolbarRef.current);

        // Enables rubberband selection
        new mxRubberband(graph);

        // Gets the default parent for inserting new cells. This is normally the first
        // child of the root (ie. layer 0).
        var parent = graph.getDefaultParent();

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
            //mxGrapg component
            var doc = mxUtils.createXmlDocument();
            var node = doc.createElement("Node");
            node.setAttribute("ComponentID", "[P01]");

            //data
        } finally {
            // Updates the display
            graph.getModel().endUpdate();
        }

        // Enables rubberband (marquee) selection and a handler for basic keystrokes
        var rubberband = new mxRubberband(graph);
        var keyHandler = new mxKeyHandler(graph);
    }
}

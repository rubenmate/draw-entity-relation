import { mxEvent, mxKeyHandler, mxUndoManager } from "mxgraph-js";

export default function configureKeyBindings(graph) {
    const undoManager = new mxUndoManager();
    const listener = (sender, evt) => {
        undoManager.undoableEditHappened(evt.getProperty("edit"));
    };
    graph.getModel().addListener(mxEvent.UNDO, listener);
    graph.getView().addListener(mxEvent.UNDO, listener);

    const keyHandler = new mxKeyHandler(graph);
    // Undo handler: CTRL + Z
    keyHandler.bindControlKey(90, (evt) => {
        undoManager.undo();
    });

    // Redo handler: CTRL + SHIFT + Z
    keyHandler.bindControlShiftKey(90, (evt) => {
        undoManager.redo();
    });

    // Delete handler.
    keyHandler.bindKey(46, (evt) => {
        if (graph.isEnabled()) {
            const currentNode = graph.getSelectionCell();
            // TODO: Tratar el borrado de los diferentes tipos de elementos
            if (currentNode.edge) {
            } else {
                graph.removeCells([currentNode]);
            }
        }
    });
}

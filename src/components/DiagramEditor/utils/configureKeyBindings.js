import { mxUndoManager, mxEvent, mxKeyHandler } from "mxgraph-js";

export default function configureKeyBindings(graph) {
    var undoManager = new mxUndoManager();
    var listener = (sender, evt) => {
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
            graph.removeCells([currentNode]);
        }
    });
}

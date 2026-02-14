const { CompositeDisposable, Disposable } = require("atom");

module.exports = {
  activate() {
    this.disposables = new CompositeDisposable(
      atom.config.observe("scrollmap-navigation.threshold", (value) => {
        this.threshold = value;
      }),
      atom.config.observe("scrollmap-navigation.maxDepth", (value) => {
        this.maxDepth = value;
      }),
    );
    this.naviService = null;
  },

  deactivate() {
    this.naviService = null;
    this.disposables.dispose();
  },

  getHeaders(editor) {
    if (!this.naviService) {
      return [];
    }
    const naviEditor = this.naviService.getEditor();
    if (!naviEditor || naviEditor.buffer !== editor.buffer) {
      return [];
    }
    return this.naviService.getFlattenHeaders?.() || [];
  },

  consumeNaviService(naviService) {
    this.naviService = naviService;
    let subscription = naviService.onDidUpdateHeaders?.((naviEditor) => {
      if (!naviEditor) return;
      for (const editor of atom.workspace.getTextEditors()) {
        if (naviEditor.buffer !== editor.buffer) continue;
        const layer = editor.scrollmap?.layers.get("navi");
        if (!layer) continue;
        layer.cache.set("data", this.getHeaders(editor));
        layer.update();
      }
    });
    return new Disposable(() => {
      this.naviService = null;
      subscription?.dispose();
    });
  },

  provideScrollmap() {
    return {
      name: "navi",
      description: "Navigation-panel header markers",
      initialize: ({ disposables, update }) => {
        disposables.add(
          atom.config.onDidChange("scrollmap-navigation.maxDepth", update),
          atom.config.onDidChange("scrollmap-navigation.threshold", update),
        );
      },
      getItems: ({ editor, cache }) => {
        const items = [];
        for (const header of cache.get("data") || []) {
          if (this.maxDepth && header.revel > this.maxDepth) {
            continue;
          }
          if (!header.startPoint) {
            continue;
          }
          items.push({
            row: editor.screenPositionForBufferPosition(header.startPoint).row,
            cls: `navigation-marker navigation-marker-${header.revel}`,
          });
        }
        if (this.threshold && items.length > this.threshold) {
          return [];
        }
        return items;
      },
    };
  },
};

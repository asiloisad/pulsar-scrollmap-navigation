const { CompositeDisposable, Disposable } = require("atom");

module.exports = {

  activate() {
    this.editors = new Map();
    this.naviService = null;
  },

  deactivate() {
    this.editors.clear();
    this.naviService = null;
  },

  consumeNaviService(naviService) {
    this.naviService = naviService;

    const updateAll = () => {
      for (const ctx of this.editors.values()) {
        ctx.update();
      }
    };

    let subscription = naviService.observeHeaders?.(updateAll);

    return new Disposable(() => {
      this.naviService = null;
      subscription?.dispose();
    });
  },

  provideScrollmap() {
    const self = this;
    return {
      name: "navi",
      subscribe: (editor, update) => {
        self.editors.set(editor, { update });
        return new CompositeDisposable(
          atom.config.observe("scrollmap-navigation.maxDepth", update),
          new Disposable(() => self.editors.delete(editor)),
        );
      },
      recalculate: (editor) => {
        if (!self.naviService) {
          return [];
        }
        const headers = self.naviService.getFlattenHeaders?.() || [];
        const maxDepth = atom.config.get("scrollmap-navigation.maxDepth");
        const items = [];
        for (const header of headers) {
          if (maxDepth && header.revel > maxDepth) {
            continue;
          }
          items.push({
            row: editor.screenPositionForBufferPosition(header.startPoint).row,
          });
        }
        return items;
      },
    };
  },
};

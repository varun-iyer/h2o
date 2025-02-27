<template>
<div class="table-of-contents"
     v-bind:class="{'editable':editing}">
     <div class="take-notes-tip" v-if="this.toc.length !== 0 && editing && verified_professor=='False'">
        <span class="take-notes-icon"></span>
        <p>Click on the content below to Take Notes!</p>
     </div>
     <button
        :aria-expanded="!tocCollapsed ? 'true' : 'false'"
        :aria-label="tocCollapsed ? 'expand all' : 'collapse all'"
        class="action-expand toc-expand"
        @click="toggleToc"
      >
      <collapse-triangle :collapsed="tocCollapsed" />
      {{ tocCollapsed ? "Expand all" : "Collapse all" }}
     </button>
     <vue-nestable v-model="toc"
                   :max-depth="100"
                   :hooks="{'beforeMove':canMove}"
                   class-prop="cssClasses"
                   v-on:change="moveSubsection"
                   :collapsed-groups="collapsedSections"
                   v-if="dataReady"
                   >
         <div slot="placeholder">
         <placeholder :editing="editing" :node-type="nodeType" />
         </div>
         <template v-slot="{item}">
         <entry :item="item"
                :root-ordinal-display="rootOrdinalDisplay"
                :editing="editing"
         />
        </template>
        </vue-nestable>
        </div>
        </template>

<script>
import _ from "lodash";
import { VueNestable } from "@holtchesley/vue-nestable";
import Placeholder from "./TableOfContents/PlaceHolder";
import Entry from "./TableOfContents/Entry";
import CollapseTriangle from "./CollapseTriangle";

import { createNamespacedHelpers } from "vuex";
const { mapActions, mapMutations } = createNamespacedHelpers(
  "table_of_contents"
);

export default {
  components: {
    VueNestable,
    Placeholder,
    Entry,
    CollapseTriangle,
  },
  data: () => ({
    needsDeleteConfirmation: {},
    tocCollapsed: false
  }),
  directives: {
    focus: {
      inserted: function(el) {
        el.focus();
      }
    }
  },
  computed: {
    collapsedSections: function() {
      return this.$store.getters["table_of_contents/collapsedNodes"](this.rootNode);
    },
    casebook: function() {
      return this.$store.getters["globals/casebook"]();
    },
    section: function() {
      return this.$store.getters["globals/section"]();
    },
    rootNode: function() {
      return this.section || this.casebook;
    },
    rootOrdinalDisplay: function() {
      return this.rootOrdinals !== ""
        ? this.rootOrdinals + "."
        : this.rootOrdinals;
    },
    nodeType: function() {
        return this.section ? "section" : "casebook";
    },
    toc: {
      get: function() {
        let toc = _.get(
          this.$store,
          `state.table_of_contents.toc.${this.rootNode}.children`
          ,[]);
        return toc;
      },
      set: function(newVal) {
        this.shuffle({ id: this.rootNode, children: newVal });
      }
    },
    dataReady: function() {
      return this.toc !== [null] && this.toc !== null;
    }
  },
  mounted: function() {
    const hash = window.location.hash;
    let attempts = 0;
    function waitForID() {
      if (null !== document.getElementById(hash.substring(1))) {
        window.location.hash = "";
        window.location.hash = hash;
      } else {
        attempts += 1;
        if (attempts < 5) {
          setTimeout(waitForID, 15);
        }
      }
    }
    if (hash !== "") {
      setTimeout(waitForID, 15);
    }
  },
  methods: {
    ...mapActions(["fetch", "commitShuffle", "moveNode"]),
    ...mapMutations(["shuffle"]),
    canMove: function(movement) {
      let { dragItem, pathFrom, pathTo } = movement;
      if (pathTo.length === 1) {
        return true;
      }
      let res_path = [];
      let path = pathTo.slice(0);
      // The pathTo potentially restructures the tree in a way that can affect lookup.
      // we need to do a small adjustment to the lookup path to account for that
      let lastFromIndex = pathFrom.pop();
      let pathToStart = path.slice(0, pathFrom.length);
      if (
        _.isEqual(pathToStart, pathFrom) &&
          path.length > pathFrom.length &&
          path[pathFrom.length] >= lastFromIndex
      ) {
        path[pathFrom.length] += 1;
      }

      let ii = path.splice(0, 1)[0];
      let curr = this.toc[ii];
      while (path.length > 0) {
        res_path.push({ ii, t: curr.resource_type });
        if (
          (curr.resource_type !== null && curr.resource_type !== "Section") ||
            curr.id === dragItem.id ||
            curr.collapsed
        ) {
          return false;
        }
        ii = path.splice(0, 1)[0];
        curr = curr.children[ii];
      }
      return true;
    },
    moveSubsection: function({ id }, { items, pathTo }) {
      function findIn(tree, id) {
        let candidates = tree.children
            .map((x, index) => {
              if (x.id === id) {
                return { parent: tree.id, index };
              } else {
                return findIn(x, id);
              }
            })
            .filter(x => x !== null);
        return candidates.length === 1 ? candidates[0] : null;
      }
      let { parent, index } = findIn({ id: null, children: items }, id);
      this.moveNode({
        casebook: this.casebook,
        rootNode: this.rootNode,
        moverId: id,
        parent,
        index
      });
    },
    collapseToc() {
      const ids = this.$store.getters["table_of_contents/topLevelNodes"](
        this.rootNode
      );
      this.$store.dispatch("table_of_contents/collapseAll", { ids });
    },
    expandToc() {
      const ids = this.$store.getters["table_of_contents/topLevelNodes"](
        this.rootNode
      );
      this.$store.dispatch("table_of_contents/expandAll", { ids });
    },
    toggleToc() {
      if (this.tocCollapsed) {
        this.tocCollapsed = false;
        this.expandToc();
      } else {
        this.tocCollapsed = true;
        this.collapseToc();
      }
    },
  },
  props: ["editing", "rootOrdinals","verified_professor"],
  created: function() {
    this.fetch({ casebook: this.casebook, subsection: this.section });
  }
};
</script>

<style lang="scss">
@import "../styles/vars-and-mixins";

#table-of-contents {
    > .table-of-contents > .nestable > ol {
        > li.nestable-item > .nestable-item-content {
            > .listing-wrapper > .listing.resource {
                padding-left: 60px;
            }
            > div > .listing-wrapper > .listing.resource {
                padding-left: 60px;
                &.temporary {
                    border: 4px solid $red;
                    padding-left: 58px;
                }
            }
        }
    }
    > .table-of-contents > .nestable > ol {
        > li.nestable-item > .nestable-item-content {
            > .listing-wrapper > .listing.resource.temporary {
                background-color: $red;
            }
        }
    }

    .transmute-dropdown:hover {
        color: black;
        border-color: black;
    }
    li.nestable-item.collapsed ol,
    li.nestable-item-copy.collapsed ol {
        display: none;
    }
    ol {
        counter-reset: item;
    }
    li {
        counter-increment: item;
        display: block;
    }
    button.action-expand {
        border: 0 solid transparent;
        background: transparent;
        margin: -8px;
    }
    button.toc-expand {
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 10px 0 10px -5px;
        padding: 0;
        font-weight: bold;

        svg polygon {
          fill: $light-blue;
          stroke: transparent;
        }

    }
    .no-collapse-padded {
        width: 32px;
        height: 32px;
        margin: 4px 7px;
    }
    .nestable-item {
        position: relative;
        .actions {
            display: flex;
            flex-direction: column;
            align-content: center;
            justify-content: center;
        }
    }
    .action-confirmation {
        /* margin-top: 1.5rem; */
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        padding-right: 10px;
        button {
            width: unset;
            height: unset;
            color: unset;
            background-color: unset;
            display: unset;
            margin: unset;
            background-position: unset;
            background-repeat: unset;
            background-size: unset;
            font-weight: 400;
            margin: 2px;
            padding: 6px 16px;
        }
        .action-cancel-delete {
            background-color: $white;
            color: $black;
            border: 1px solid black;
        }
    }
    li.nestable-item.is-dragging {
        border: 4px dashed grey;
        border-radius: 8px;
        margin-top: 8px;
        margin-bottom: 8px;
        .listing {
            margin-top: 0px;
            &.section:hover,
            &.section:focus-within {
                background-color: $black;
                .section-number,
                .section-title {
                    color: $white;
                }
                .action-cancel-delete {
                    color: black;
                }
                .transmute-dropdown {
                    color: black;
                    border-color: black;
                }
            }
            &.resource:hover,
            &.resource:focus-within {
                background-color: $white;
                .resource-case,
                .resource-date,
                .section-number,
                .section-title,
                .action-cancel-delete {
                    color: $black;
                }
            }
        }
    }
    .listing {
        display: flex;
        justify-content:space-between;
        align-items: baseline;
        width: 100%;
        padding: 12px 16px;
        /* padding-right: 42px; */
        margin-top: 6px;
        border: 1px solid $black;

        .list-left,
        .list-right {
            display: flex;
            flex-direction:row;
            div {
                align-self:baseline;
            }
            .is-instructional-material {
                background-image:url('~static/images/ui/casebook/lock.svg') ;
                height: 20px;
                width: 20px;
                margin-left: -5px;
                display: inline-block;
                align-self: flex-end;
            }
        }
        .list-right {
            margin-left: 8px;
        }
        .actions {
            position: relative;
            top: 12px;
        }
        &.section {
            .actions {
                min-height:44px;
            }

            align-items: left;
            background-color: $black;

            @media (max-width: $screen-xs) {
                flex-direction: row;
            }

            .section-title {
                display: inline;
                font-weight: $medium;
            }
            .section-number,
            .section-title {
                color: $white;
                margin-right: 10px;
                display:inline;
            }
            .resource-type-container {
                display: flex;
                align-items: center;
                justify-content: flex-end;

                @media (max-width: $screen-xs) {
                    margin-right: -4px;

                    .resource-type {
                        padding: 2px 7px;
                    }
                }
            }
            .btn.btn-danger {
                color: #fff;
                background-color: #c9302c;
                border-color: #ac2925;
            }


        }
        &.resource {
            background-color: $white;

            @media (max-width: $screen-xs) {
                .resource-container {
                    margin: 0 9px;
                }
            }

            .section-title {
                display: inline;
            }

            .case-section-title {
                margin-bottom: 4px;
            }

            .section-number,
            .section-title {
                color: $black;
            }

            .case-metadata-container {
                display: flex;
                align-items: center;

                @media (max-width: $screen-xxs) {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .resource-case:empty {
                    display: none;
                }

                .resource-case {
                    margin-right: 9px;
                }
            }

            .resource-type-container {
                display: flex;
                align-items: center;
                justify-content: flex-end;

                @media (max-width: $screen-xs) {
                    margin-right: -4px;

                    .resource-type {
                        padding: 2px 7px;
                    }
                }
            }
            .btn.btn-danger {
                color: #fff;
                background-color: #c9302c;
                border-color: #ac2925;
            }
        }
        &.empty {
            border: 1px dashed $gray;
            text-align: center;
            color: $dark-gray;
            background: transparent;
            padding: 60px;
        }
        &.section:hover,
        &.section:focus,
        &.section:focus-within,
        &.resource:hover,
        &.resource:focus,
        &.resource:focus-within {
            outline: 2px solid $white;
            background-color: $light-blue;
            border-color: $light-blue;
            * {
                color: $white;
                border-color: $white;
            }
            *:focus {
                outline: none !important;
            }
            *:focus-visible {
                outline: 2px solid $white !important;
            }
            .transmute-dropdown {
                color: black;
                border-color: black;
            }
            .action-cancel-delete {
                color: black;
            }

            .btn.btn-danger {
                color: #fff;
                background-color: #c9302c;
                border-color: #ac2925;

                &:hover {
                    color: #fff;
                    background-color: #d9534f;
                    border-color: #d43f3a;
                }
            }
            .btn.specify-case-button {
                color:black;
            }
        }
        @media (max-width: $screen-xs) {
            &.section,
            &.resource {
                div {
                    margin: 4px 0;
                    padding-left: 0;
                    text-align: left;
                }
            }
        }
        @media (min-width: $screen-xs) {
            &.section {
                flex-direction: row;
                align-items: baseline;
            }
        }
        .section-number,
        .section-number:after {
            font-size: 12px;
            display: inline;
            margin-right: 10px;
        }
        .section-number:after {}
        .section-title {
            @include sans-serif($bold, 14px, 14px);
            display: inline-block;
        }
        .resource-type,
        .resource-case,
        .resource-date {
            @include sans-serif($light, 14px, 14px);
            display: inline-block;

            text-align: left;
            color: $black;
        }

        .resource-type {
            border: 1px solid $light-blue;
            color: $light-blue;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 12px;
            font-weight: bold;
            height: 20px;
            width: 82px;
        }
    }
    &.confirm-delete {
        margin-right: 160px;
    }
    ol.nestable-list.nestable-group {
        padding-left: 0px;
    }
    .nestable-list {
        .nestable-list {
            border-left: 8px solid $light-blue;
            padding-left: 16px;
            margin-left: 30px;
        }
    }
    div.editable .nestable-list .nestable-list {
        border-left: 8px solid $yellow;
        padding-left: 16px;
        margin-left: 30px;
    }
    .nestable-drag-layer {
        opacity: 0.7;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 100;
        pointer-events: none;
        .listing {
            .section-number:before {
                content: "-";
            }
        }
    }
}
.table-of-contents .add-content-link div {
    display: inline;
    button.action.one-line.add-resource {
        border: none;
        background-color: rgba(0, 0, 0, 0);
        text-decoration: underline;
        color: $light-blue;
        display: inline;

        &:hover {
            font-weight: bold;
        }
    }
}

.editable .take-notes-tip{
    justify-content: center;
    margin: 5%;
    display:flex;
    flex-direction: row;
    p{
       padding:12px;
       margin:0px;
       text-align: center;
       font-weight: 900;
    }
    .take-notes-icon{
        background-image:url('~static/images/take-notes-icon.svg') ;
        display: inline-block;
        height: 40px;
        width: 40px;
    }
}

.nestable-list li.nestable-item.trailing-node {
    height: 68px;
    margin-top: 8px;
}

.nestable-list:not(:last-child) li.nestable-item.trailing-node {
    border: 2px dashed black;
}
</style>


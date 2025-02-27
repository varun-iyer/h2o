<template>
  <div>
    <button
      class="action one-line add-resource"
      v-on:click.stop.prevent="displayModal()"
    >Add Content</button>
    <Modal v-if="showModal" @close="showModal = false" :initial-focus="focusTarget">
      <template slot="title">Add Resource</template>
      <template slot="body">
        <div class="search-tabs">
          <a
            v-bind:class="{ active: caseTab, 'search-tab': true }"
            v-on:click.stop.prevent="setTab('case')"
          >Find a Legal Document</a>
          <a
            v-bind:class="{ active: textTab, 'search-tab': true }"
            v-on:click.stop.prevent="setTab('text')"
          >Create Custom Content</a>
          <a
            v-bind:class="{ active: linkTab, 'search-tab': true }"
            v-on:click.stop.prevent="setTab('link')"
          >Add Link</a>
        </div>

        <div class="add-resource-body" v-if="caseTab">
          <case-searcher
            :search-on-top="false"
            :can-cancel="true"
            v-model="caseQueryObj"
            @choose="selectCase"
          />
          <case-results :queryObj="caseQueryObj" @choose="selectCase"/>
        </div>
        <div class="add-resource-body" v-else-if="textTab">
          <form ref="textForm" class="new-text" v-on:submit.stop.prevent="submitTextForm()">
            <div v-bind:class="{'form-group': true, 'has-error': errors.name}">
              <label class="title">
                Title
                <input
                  class="form-control"
                  name="name"
                  type="text"
                  v-model="textTitle"
                  v-focus
                />
                <span class="help-block" v-if="errors.name">
                  <strong>{{errors.name[0].message}}</strong>
                </span>
              </label>
            </div>
            <div v-bind:class="{'form-group': true, 'has-error': errors.content}">
              <label class="textarea">
                Body
                <editor
                  v-model="textContent"
                ></editor>
                <span class="help-block has-error" v-if="errors.content">
                  <strong>{{errors.content[0].message}}</strong>
                </span>
              </label>
            </div>
            <input class="save-button" type="submit" :value="pendingSubmit ? 'Save in progress' : 'Save Text'" :disabled="pendingSubmit" />
          </form>
        </div>
        <div class="add-resource-body" v-else-if="linkTab">
          <h3>Enter the URL of any asset to link from the web.</h3>
          <h4>Some examples: YouTube videos, PDFs, JPG, PNG, or GIF images</h4>
          <form ref="linkForm" class="new-link" v-on:submit.stop.prevent="submitLinkForm()">
            <div v-bind:class="{'form-group': true, 'has-error': errors.url}">
              <input
                class="form-control"
                ref="link_body"
                name="url"
                type="text"
                placeholder="Enter a URL to add it to your casebook"
                v-model="linkTarget"
                v-focus
              />
              <span class="help-block has-error" v-if="errors.url">
                <strong>{{errors.url[0].message}}</strong>
              </span>
            </div>
            <input class="search-button" type="submit" :value="pendingSubmit ? 'Save in progress' : 'Add Link'" :disabled="pendingSubmit" />
          </form>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script>
import Modal from "./Modal";
import CaseSearcher from "./CaseSearcher";
import CaseResults from "./CaseResults";
import Editor from "./TinyMCEEditor";


import Axios from "../config/axios";
import _ from "lodash";
import urls from "libs/urls";
import { createNamespacedHelpers } from "vuex";
const { mapActions } = createNamespacedHelpers("case_search");


export default {
  components: {
    Modal,
    CaseSearcher,
    CaseResults,
    editor: Editor
  },
  props: ["casebook", "section"],
  data: () => ({
    pendingSubmit: false,
    showModal: false,
    currentTab: "case",
    caseQueryObj: {query: ""},
    textTitle: "",
    textContent: "",
    linkTarget: "",
    errors: {}
  }),
  computed: {
    focusTarget: function() {
      if (this.caseTab) {
        return this.$refs.case_search;
      } else if (this.textTab) {
        return this.$refs.text_body;
      } else if (this.linkTab) {
        return this.$refs.link_body;
      }
      return null;
    },
    caseTab: function() {
      return this.currentTab === "case";
    },
    textTab: function() {
      return this.currentTab === "text";
    },
    linkTab: function() {
      return this.currentTab === "link";
    }
  },
  methods: {
    ...mapActions(["fetch"]),
    docImportUrl: urls.url('from_source'),
    docAddUrl: urls.url('new_legal_doc'),
    displayModal: function displayModal() {
      this.showModal = true;
    },
    properType: function properType() {
      return this.sectionType[0].toUpperCase() + this.sectionType.substr(1);
    },
    setTab: function setTab(newTab) {
      const self = this;
      let tries = 0;
      function tryFocus() {
        if (self.$refs.case_search) {
          self.$refs.case_search.focus();
        } else {
          tries += 1;
          if (tries < 10) self.$nextTick(tryFocus);
        }
      }
      this.currentTab = newTab;
      tryFocus();
    },
    runCaseSearch: function runCaseSearch() {
      if (this.caseQuery !== "") {
        this.fetch({ query: this.caseQuery });
      }
    },
    submitCaseForm: function submitCaseForm() {},
    submitTextForm: function submitTextForm() {
      let formData = new FormData(this.$refs.textForm);
      formData.append("section", this.section);
      formData.set("content", this.textContent);
      const url = `/casebooks/${this.casebook}/new/text`;
      this.pendingSubmit = true;
      Axios.post(url, formData).then(
        this.handleSubmitResponse,
        this.handleSubmitErrors
      );
    },
    submitLinkForm: function submitLinkForm() {
      let formData = new FormData(this.$refs.linkForm);
      formData.append("section", this.section);
      const url = `/casebooks/${this.casebook}/new/link`;
      this.pendingSubmit = true;
      Axios.post(url, formData).then(
        this.handleSubmitResponse,
        this.handleSubmitErrors
      );
    },
    selectCase: function(c) {
      let importUrl = this.docImportUrl({sourceId: c.source_id});
      let addUrl = this.docAddUrl({casebookId: this.casebook});
      let formData = new FormData();
      formData.append("section", this.section);
      const handler = this.handleSubmitResponse;
      this.pendingSubmit = true;
      Axios.post(importUrl, { id: c.id }).then(resp => {
          formData.append("resource_id", resp.data.id)
          Axios.post(addUrl, formData).then(handler, this.handleSubmitErrors);
      });
    },
    handleSubmitResponse: function handleSubmitResponse(response) {
      let location = response.request.responseURL;
      window.location.href = location;
      this.errors = {};
      this.pendingSubmit = false;
    },
    handleSubmitErrors: function handleSubmitErrors(error) {
      this.pendingSubmit = false;
      if (error.response.data) {
        this.errors = error.response.data;
      }
    }
  }
};
</script>

<style lang="scss">
@use "sass:color";
@import "variables";
label.textarea {
  width: 100%;
}
.search-tabs {
  display: flex;
  flex-direction: row;
  a.search-tab {
    color: black;
  }
}

.search-results {
  overflow-y: unset;
  overflow-x: unset;
  display: table;
  width: 100%;
  .search-results-entry {
    display: table-row;
    div {
      padding: 0.4rem 0.2rem;

      &.cite-column {
        min-width: 9rem;
      }
      &.date-column {
        min-width: 9rem;
      }
      &.preview-column {
        width: 6rem;
      }
      display: table-cell;
    }

    &:hover {
      background-color: color.adjust($light-blue, $alpha: -0.75);
      cursor: pointer;
    }
    a[target="_blank"]:after {
      content: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAQElEQVR42qXKwQkAIAxDUUdxtO6/RBQkQZvSi8I/pL4BoGw/XPkh4XigPmsUgh0626AjRsgxHTkUThsG2T/sIlzdTsp52kSS1wAAAABJRU5ErkJggg==);
      margin: 0 3px 0 5px;
      color: black;
    }
  }
}

.search-alert {
  display: flex;
  flex-direction: row;
  .spinner-message {
    flex-direction: column;
    align-content: center;
    justify-content: center;
    display: flex;
    margin-right: 14px;
    margin-left: 12px;
  }
}

a.action.add-resource {
  background-image: url(http://localhost:8080/static/dist/img/add-material.d109215f.svg);
}
</style>

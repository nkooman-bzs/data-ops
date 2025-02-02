import { describe, expect, it } from "vitest";

import { makeContentTypeSnippetHandler } from "../../../../src/modules/sync/diff/contentTypeSnippet";
import { ContentTypeSnippetsSyncModel } from "../../../../src/modules/sync/types/syncModel";

describe("makeContentTypeSnippetHandler", () => {
  it("creates operations for all changed properties", () => {
    const source: ContentTypeSnippetsSyncModel = {
      name: "new name",
      codename: "type",
      elements: [
        {
          type: "number",
          codename: "element_1",
          name: "number",
        },
        {
          type: "text",
          codename: "element_2",
          name: "text",
        },
        {
          type: "date_time",
          codename: "element_3",
          name: "date",
        },
      ],
    };
    const target: ContentTypeSnippetsSyncModel = {
      name: "old name",
      codename: "type",
      elements: [
        {
          type: "number",
          codename: "element_1",
          name: "num",
        },
        {
          type: "date_time",
          codename: "element_3",
          name: "date",
        },
        {
          type: "text",
          codename: "toDelete",
          name: "to delete",
        },
        {
          type: "text",
          codename: "element_2",
          name: "txt",
        },
      ],
    };

    const result = makeContentTypeSnippetHandler({
      targetItemsByCodenames: new Map(),
      targetAssetsByCodenames: new Map(),
    })(source, target);

    expect(result).toStrictEqual([
      {
        op: "replace",
        path: "/name",
        value: "new name",
        oldValue: "old name",
      },
      {
        op: "replace",
        path: "/elements/codename:element_1/name",
        value: "number",
        oldValue: "num",
      },
      {
        op: "replace",
        path: "/elements/codename:element_2/name",
        value: "text",
        oldValue: "txt",
      },
      {
        op: "remove",
        path: "/elements/codename:toDelete",
        oldValue: {
          type: "text",
          codename: "toDelete",
          name: "to delete",
        },
      },
      {
        op: "move",
        path: "/elements/codename:element_2",
        after: {
          codename: "element_1",
        },
      },
      {
        op: "move",
        path: "/elements/codename:element_3",
        after: {
          codename: "element_2",
        },
      },
    ]);
  });
});

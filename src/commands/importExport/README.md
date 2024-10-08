# Export & Import

## Export

With the `export` command, you can export data from your Kontent.ai environment into a single `.zip` file.
The command uses [the Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2) to get the environment data.

### Usage

```bash
npx @kontent-ai/data-ops@latest export --environmentId=<environment-id-to-export> --apiKey=<Management-API-key>
```

To see all supported parameters, run `npx @kontent-ai/data-ops@latest export --help`.

### Export programmatically

To export data from environment in your scripts, use `exportEnvironment` function:

```ts
import { exportEnvironment, ExportEnvironmentParams } from "@kontent-ai/data-ops";

const params: ExportEnvironmentParams = {
  environmentId: "<env-id>",
  apiKey: "<mapi-key>",
};

await exportEnvironment(params);
```

### Structure of the Exported Data

The exported `.zip` package contains a `.json` file for each exported entity and a `metadata.json` file with additional information.
Format of all the entities is compatible with the output of the [Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2/).

> [!TIP]
> If you need the data in a different format, you can process the `.zip` data with a variety of other tools to transform it as per your requirements.

```
- output.zip
|- assetFolders.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Asset-folders
|- assets
 |- All the asset files named <assetId>-<fileName>
|- assets.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Assets
|- contentItems.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Content-items
|- contentTypeSnippets.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Content-type-snippets
|- languageVariants.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Language-variants
|- languages.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/languages
|- metadata.json # version, timestamp, environmentId
|- previewUrls.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Preview-URLs
|- roles.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Roles
|- workflows.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Workflows
|- webSpotlight.json # https://kontent.ai/learn/docs/apis/openapi/management-api-v2/#tag/Web-spotlight
```
You can check out exported data of an example project in [the data for integration tests](https://github.com/kontent-ai/data-ops/blob/main/tests/integration/importExport/data/exportSnapshot.zip).

> [!CAUTION]
> Exporting roles requires the [Enterprise plan](https://kontent.ai/pricing).
>
> To avoid exporting roles, you can either list them in the `--exclude` parameter or specify only the desired entities in the `--include` parameter.
> (e.g. `npx @kontent-ai/data-ops@latest export ... --exclude roles`).
>
> To get more information about available parameters, run `npx @kontent-ai/data-ops@latest export --help`.


## Import

With the `import` command, you can import data into your Kontent.ai environment.
The command uses [the Management API](https://kontent.ai/learn/docs/apis/openapi/management-api-v2) to import the data.

> [!CAUTION]
> **The target environment needs to be empty**, otherwise the command might fail (e.g. when there are entities with the same codename already present).

> [!TIP]
> The command requires the import data in a `.zip` file with the same [structure](#structure-of-the-exported-data) as that produced by the [export command](#export).
>
> To import data from a different structure, you can transform it to the supported format using a tool of your choice.

### Usage

```bash
npx @kontent-ai/data-ops@latest import --fileName <file-to-import> --environmentId <target-environment-id> --apiKey <Management-API-key>
```
To see all supported parameters, run `npx @kontent-ai/data-ops@latest import --help`.

### Import Programmatically

To import data to environment in your scripts, use `importEnvironment` function:

```ts
import { importEnvironment, ImportEnvironmentParams } from "@kontent-ai/data-ops";

const params: ImportEnvironmentParams = {
  environmentId: "<env-id>",
  apiKey: "<mapi-key>",
  fileName: "<filename>",
};

await importEnvironment(params);
```

## Known Limitations
### Entity limitations

Roles and [asset type](https://kontent.ai/learn/docs/assets/asset-organization#a-set-up-the-asset-type) entities are currently not being exported due to API limitations.
The tool also can't set role limitations when importing workflows.

### Multiple Versions of content
Since the API format doesn't support language variants with both a published version and a draft version, only the [newest version](https://kontent.ai/learn/docs/workflows-publishing/create-new-versions) will be exported or imported.
Published language variants that don't exist in any other workflow step are exported correctly.

### Content Scheduled For Publishing
As the current API format doesn't support inclusion of the publishing time for variants scheduled to be published, the tool instead puts the scheduled variants into the draft step (the first step in the workflow).

### Asset Size
The management API accepts only assets smaller than 100MB.
If your export file contains assets bigger than that (they can be uploaded through the UI), the tool won't be able to import them.

### Performance
The tool leverages the Management API to work with the project data and thus is bound by the API rate limitations.

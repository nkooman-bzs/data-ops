import { config as dotenvConfig } from "dotenv";
import * as fsPromises from "fs/promises";
import * as path from "path";
import { describe, expect, it } from "vitest";

import * as fileNames from "../../../src/modules/sync/constants/filename.ts";
import { syncModelRun } from "../../../src/public.ts";
import { expectDifferentAllEnvData, expectSameAllEnvData, prepareReferences } from "../importExport/utils/compare.ts";
import { AllEnvData, loadAllEnvData } from "../importExport/utils/envData.ts";
import { runCommand } from "../utils/runCommand.ts";
import { withTestEnvironment } from "../utils/setup.ts";

dotenvConfig();

const { SYNC_SOURCE_TEST_ENVIRONMENT_ID, API_KEY, SYNC_TARGET_TEST_ENVIRONMENT_ID } = process.env;

if (!API_KEY) {
  throw new Error("API_KEY env variable was not provided.");
}
if (!SYNC_SOURCE_TEST_ENVIRONMENT_ID) {
  throw new Error("SYNC_SOURCE_TEST_ENVIRONMENT_ID environment variable is not defined.");
}
if (!SYNC_TARGET_TEST_ENVIRONMENT_ID) {
  throw new Error("SYNC_TARGET_TEST_ENVIRONMENT_ID env variable was not provided.");
}

const allSyncEntities = [
  "types",
  "snippets",
  "taxonomies",
  "webSpotlight",
  "assetFolders",
  "collections",
  "languages",
  "spaces",
  "workflows",
] as const;

type SyncEntityName = (typeof allSyncEntities)[number];

const expectSameSyncEnvironments = async (
  environmentId1: string,
  environmentId2: string,
  include: ReadonlyArray<SyncEntityName> = allSyncEntities,
): Promise<void> => {
  const coInclude = allSyncEntities.filter(e => !include.includes(e) && e !== "webSpotlight");
  const data1 = await loadAllEnvData(environmentId1, { include: allSyncEntities })
    .then(prepareReferences)
    .then(sortAssetFolders)
    .then(prepareLanguages);
  const data2 = await loadAllEnvData(environmentId2, { include: allSyncEntities })
    .then(prepareReferences)
    .then(sortAssetFolders)
    .then(prepareLanguages);

  expectSameAllEnvData(data1, data2, { include });
  expectDifferentAllEnvData(data1, data2, { include: coInclude });
};

const sortAssetFolders = (allData: AllEnvData): AllEnvData => ({
  ...allData,
  assetFolders: allData.assetFolders.toSorted((a, b) => a.codename.localeCompare(b.codename)),
});

const prepareLanguages = (allData: AllEnvData): AllEnvData => ({
  ...allData,
  languages: allData.languages.filter(l => l.is_active).toSorted((a, b) => a.codename.localeCompare(b.codename)),
});

describe.concurrent("Sync model of two environments with credentials", () => {
  it.concurrent(
    "Sync source environment to target environment directly from source environment",
    withTestEnvironment(SYNC_TARGET_TEST_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `sync-model run -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} --sk=${API_KEY} -t=${environmentId} --tk=${API_KEY} --entities=contentTypes contentTypeSnippets taxonomies webSpotlight assetFolders collections spaces languages workflows --verbose --skipConfirmation`;

      await runCommand(command);

      await expectSameSyncEnvironments(environmentId, SYNC_SOURCE_TEST_ENVIRONMENT_ID);
    }),
  );

  it.concurrent(
    "Sync source environment to target environment directly from source environment with include core entities",
    withTestEnvironment(SYNC_TARGET_TEST_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `sync-model run -s=${SYNC_SOURCE_TEST_ENVIRONMENT_ID} --sk=${API_KEY} -t=${environmentId} --tk=${API_KEY} --entities contentTypes contentTypeSnippets taxonomies --verbose --skipConfirmation`;

      await runCommand(command);

      await expectSameSyncEnvironments(environmentId, SYNC_SOURCE_TEST_ENVIRONMENT_ID, [
        "types",
        "snippets",
        "taxonomies",
      ]);
    }),
  );

  it.concurrent(
    "Sync target environment to source environment directly from target environment using API",
    withTestEnvironment(SYNC_SOURCE_TEST_ENVIRONMENT_ID, async (environmentId) => {
      await syncModelRun({
        sourceEnvironmentId: SYNC_TARGET_TEST_ENVIRONMENT_ID,
        sourceApiKey: API_KEY,
        targetEnvironmentId: environmentId,
        targetApiKey: API_KEY,
        verbose: true,
        entities: {
          contentTypes: () => true,
          contentTypeSnippets: () => true,
          taxonomies: () => true,
          collections: () => true,
          assetFolders: () => true,
          spaces: () => true,
          languages: () => true,
          workflows: () => true,
          webSpotlight: true,
        },
      });

      await expectSameSyncEnvironments(environmentId, SYNC_TARGET_TEST_ENVIRONMENT_ID);
    }),
  );

  it.concurrent(
    "Sync target environment languages to source environment directly from target environment using API",
    withTestEnvironment(SYNC_SOURCE_TEST_ENVIRONMENT_ID, async (environmentId) => {
      await syncModelRun({
        sourceEnvironmentId: SYNC_TARGET_TEST_ENVIRONMENT_ID,
        sourceApiKey: API_KEY,
        targetEnvironmentId: environmentId,
        targetApiKey: API_KEY,
        verbose: true,
        entities: {
          languages: () => true,
        },
      });

      await expectSameSyncEnvironments(environmentId, SYNC_TARGET_TEST_ENVIRONMENT_ID, ["languages"]);
    }),
  );
});

describe.concurrent("Sync environment from folder", () => {
  const folderPath = path.join(__dirname, "data/sourceContentModel");

  it.sequential("generate sync model test", async () => {
    const command = `sync-model export -e ${SYNC_SOURCE_TEST_ENVIRONMENT_ID} -k ${API_KEY} -f ${folderPath}`;
    await runCommand(command);

    const folderExists = await fsPromises.stat(folderPath)
      .then(stats => stats.isDirectory())
      .catch(() => false);

    expect(folderExists).toEqual(true);

    const filesExistence = Object.fromEntries(
      await Promise.all(
        Object.values(fileNames).map((filename) =>
          fsPromises.stat(`${folderPath}/${filename}`)
            .then(stats => [filename, stats.isFile()])
            .catch((e) => [filename, e])
        ),
      ),
    );

    const allFilesExist = Object.fromEntries(Object.values(fileNames).map(value => [value, true]));

    expect(filesExistence).toEqual(allFilesExist);
  });

  it.sequential(
    "Sync environment from folder",
    withTestEnvironment(SYNC_TARGET_TEST_ENVIRONMENT_ID, async (environmentId) => {
      const command =
        `sync-model run -t=${environmentId} --tk=${API_KEY} -f=${folderPath} --entities=contentTypes contentTypeSnippets taxonomies webSpotlight assetFolders collections spaces languages workflows  --verbose --skipConfirmation`;

      await runCommand(command);

      await expectSameSyncEnvironments(environmentId, SYNC_SOURCE_TEST_ENVIRONMENT_ID);
    }),
  );
});

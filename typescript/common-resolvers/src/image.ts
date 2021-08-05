import { v4 as uuidv4 } from "uuid";
import "isomorphic-fetch";

import type {
  MutationCreateImageArgs,
  QueryImageArgs,
  QueryImagesArgs,
} from "@labelflow/graphql-types";

import mime from "mime-types";
import { projectTypename } from "./project";
import { probeImage } from "./utils/probe-image";

import { Context, DbImage } from "./types";
import { throwIfResolvesToNil } from "./utils/throw-if-resolves-to-nil";

// Queries
const labelsResolver = async (
  { id }: DbImage,
  _args: any,
  { repository }: Context
) => {
  return repository.label.list({ imageId: id });
};

const image = async (_: any, args: QueryImageArgs, { repository }: Context) =>
  throwIfResolvesToNil(
    "No image with such id",
    repository.image.getById
  )(args?.where?.id);

const images = async (
  _: any,
  args: QueryImagesArgs,
  { repository }: Context
) => {
  return repository.image.list(args?.where, args?.skip, args?.first);
};

// Mutations
const getImageFileKey = (
  imageId: string,
  projectId: string,
  mimetype: string
) => `${projectId}/${imageId}.${mime.extension(mimetype)}`;

const createImage = async (
  _: any,
  args: MutationCreateImageArgs,
  { repository }: Context
): Promise<DbImage> => {
  const {
    file,
    id,
    name,
    height,
    width,
    mimetype,
    path,
    url,
    externalUrl,
    projectId,
  } = args.data;

  // Since we don't have any constraint checks with Dexie
  // we need to ensure that the projectId matches some
  // entity before being able to continue.
  await throwIfResolvesToNil(
    `The project id ${projectId} doesn't exist.`,
    repository.project.getById
  )(projectId);

  const now = args?.data?.createdAt ?? new Date().toISOString();
  const imageId = id ?? uuidv4();
  let finalUrl: string | undefined;

  if (
    !(
      (!file && !externalUrl && url) ||
      (!file && externalUrl && !url) ||
      (file && !externalUrl && !url)
    )
  ) {
    throw new Error(
      "Image creation upload must include either a `file` field of type `Upload`, or a `url` field of type `String`, or a `externalUrl` field of type `String`"
    );
  }

  if (!file && !externalUrl && url) {
    // No File Upload
    finalUrl = url;
  }

  if (!file && externalUrl && !url) {
    // External file based upload
    const fetchResult = await fetch(externalUrl, {
      method: "GET",
      mode: "cors",
      headers: {
        Accept: "image/tiff,image/jpeg,image/png,image/*,*/*;q=0.8",
        "Sec-Fetch-Dest": "image",
      },
      credentials: "omit",
    });

    if (fetchResult.status !== 200) {
      throw new Error(
        `Could not fetch image at url ${externalUrl} properly, code ${fetchResult.status}`
      );
    }

    const blob = await fetchResult.blob();
    const uploadTarget = await repository.upload.getUploadTargetHttp(
      getImageFileKey(imageId, projectId, blob.type)
    );

    // eslint-disable-next-line no-underscore-dangle
    if (uploadTarget.__typename !== "UploadTargetHttp") {
      throw new Error(
        "This Server does not support file upload. You can create images by providing a `file` directly in the `createImage` mutation"
      );
    }

    finalUrl = uploadTarget.downloadUrl;
    await repository.upload.put(uploadTarget.uploadUrl, blob);
  }

  if (file && !externalUrl && !url) {
    // File Content based upload

    const uploadTarget = await repository.upload.getUploadTargetHttp(
      getImageFileKey(imageId, projectId, file.type)
    );

    // eslint-disable-next-line no-underscore-dangle
    if (uploadTarget.__typename !== "UploadTargetHttp") {
      throw new Error(
        "This Server does not support file upload. You can create images by providing a `file` directly in the `createImage` mutation"
      );
    }
    finalUrl = uploadTarget.downloadUrl;

    await repository.upload.put(uploadTarget.uploadUrl, file);
  }

  // Probe the file to get its dimensions and mimetype if not provided
  const imageMetaData = await probeImage(
    {
      width,
      height,
      mimetype,
      url: finalUrl!,
    },
    repository
  );

  const newImageEntity: DbImage = {
    projectId,
    createdAt: now,
    updatedAt: now,
    id: imageId,
    url: finalUrl!,
    externalUrl,
    path: path ?? externalUrl ?? finalUrl!,
    name:
      name ??
      externalUrl?.substring(
        externalUrl?.lastIndexOf("/") + 1,
        externalUrl?.indexOf("?")
      ) ??
      finalUrl!.substring(
        finalUrl!.lastIndexOf("/") + 1,
        finalUrl!.indexOf("?")
      ),
    ...imageMetaData,
  };

  await repository.image.add(newImageEntity);

  return newImageEntity;
};

const imagesAggregates = (parent: any) => {
  // Forward `parent` to chained resolvers if it exists
  return parent ?? {};
};

const totalCount = (parent: any, _args: any, { repository }: Context) => {
  // eslint-disable-next-line no-underscore-dangle
  const typename = parent?.__typename;

  if (typename === projectTypename) {
    return repository.image.count({
      projectId: parent.id,
    });
  }

  return repository.image.count();
};

export default {
  Query: {
    image,
    images,
    imagesAggregates,
  },

  Mutation: {
    createImage,
  },

  Image: {
    labels: labelsResolver,
  },

  ImagesAggregates: { totalCount },

  Project: {
    imagesAggregates,
  },
};

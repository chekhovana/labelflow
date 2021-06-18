import { DbLabel, DbLabelClass } from "../../../connectors/database";
import { Image } from "../../../graphql-types.generated";
import {
  convertLabelClassToCocoCategory,
  convertLabelClassesToCocoCategories,
  convertLabelToCocoAnnotation,
  convertLabelsOfImageToCocoAnnotations,
  convertImageToCocoImage,
  initialCocoDataset,
  convertLabelflowDatasetToCocoDataset,
  convertImagesToCocoImages,
} from "../converters";
import { CocoCategory, CocoAnnotation, CocoImage } from "../types";

describe("Coco converters", () => {
  const date = new Date("1995-12-17T03:24:00").toISOString();

  const createLabelClass = (name: string): DbLabelClass => ({
    id: `id-${name}`,
    createdAt: date,
    updatedAt: date,
    name,
    color: "#000000",
  });

  const createLabel = (
    id: string,
    imageId: string,
    labelClassId?: string
  ): DbLabel => ({
    id,
    createdAt: date,
    updatedAt: date,
    imageId,
    x: 1,
    y: 2,
    width: 3,
    height: 4,
    labelClassId,
  });

  const createImage = (name: string, height: number, width: number): Image => ({
    id: `id-${name}`,
    name: `${name}.ext`,
    createdAt: date,
    updatedAt: date,
    height,
    width,
    url: `http://${name}`,
    path: "/path",
    mimetype: "file/ext",
    labels: [],
  });

  test("Should convert a label class to a coco category", () => {
    const myLabelClass = createLabelClass("My Label Class");

    const cocoCategory = convertLabelClassToCocoCategory(myLabelClass, 1);

    const expectedCocoCategory: CocoCategory = {
      id: 1,
      name: "My Label Class",
      supercategory: "",
    };

    expect(cocoCategory).toEqual(expectedCocoCategory);
  });

  test("Should convert some label classes to coco categories", () => {
    const labelClassList = [
      createLabelClass("a-label-class"),
      createLabelClass("another-label-class"),
    ];

    const { cocoCategories, labelClassIdsMap } =
      convertLabelClassesToCocoCategories(labelClassList);

    const expectedCocoCategories = [
      {
        id: 1,
        // ...
      },
      {
        id: 2,
        // ...
      },
    ];

    const expectedLabelClassIdsMap = {
      "id-a-label-class": 1,
      "id-another-label-class": 2,
    };

    expect(cocoCategories).toMatchObject(expectedCocoCategories);
    expect(labelClassIdsMap).toMatchObject(expectedLabelClassIdsMap);
  });

  test("Should convert a label to a coco annotation without category", () => {
    const label = createLabel("a-label-id", "an-image-id");

    const cocoAnnotation = convertLabelToCocoAnnotation(label, 1, 42, null);

    const expectedAnnotation: CocoAnnotation = {
      id: 1,
      image_id: 42,
      category_id: null,
      segmentation: [],
      area: 12,
      bbox: [1, 2, 3, 4],
      iscrowd: 0,
    };

    expect(cocoAnnotation).toEqual(expectedAnnotation);
  });

  test("Should convert a label class to coco annotation and assign it to a category", () => {
    const label = createLabel("a-label-id", "an-image-id");

    const cocoAnnotation = convertLabelToCocoAnnotation(label, 1, 42, 1);

    const expectedAnnotation: Partial<CocoAnnotation> = {
      category_id: 1,
      // ...
    };

    expect(cocoAnnotation).toMatchObject(expectedAnnotation);
  });

  test("Should convert some labels to coco annotations and assign them to an image without id offset", () => {
    const labels = [
      createLabel("a-label-id", "an-image-id", "id-a-label-class"),
      createLabel("another-label-id", "an-image-id", "id-another-label-class"),
    ];

    const imageIdsMap = {
      "an-image-id": 1,
    };

    const labelClassIdMap = {
      "id-a-label-class": 1,
      "id-another-label-class": 2,
    };

    const cocoAnnotations = convertLabelsOfImageToCocoAnnotations(
      labels,
      imageIdsMap,
      labelClassIdMap
    );

    const expectedAnnotations = [
      {
        id: 1,
        image_id: 1,
        category_id: 1,
        // ...
      },
      {
        id: 2,
        image_id: 1,
        category_id: 2,
        // ...
      },
    ];

    expect(cocoAnnotations).toMatchObject(expectedAnnotations);
  });

  test("Should convert an image to coco json image", () => {
    const image = createImage("an-image", 1, 2);

    const cocoImage = convertImageToCocoImage(image, 1);

    const expectedCocoImage: CocoImage = {
      id: 1,
      date_captured: date,
      height: 1,
      width: 2,
      coco_url: "http://an-image",
      file_name: "an-image.ext",
      flickr_url: "",
      license: 0,
    };

    expect(cocoImage).toEqual(expectedCocoImage);
  });

  test("Should convert a list of images to coco images", () => {
    const images = [
      createImage("an-image", 1, 2),
      createImage("another-image", 3, 4),
    ];

    const { cocoImages, imageIdsMap } = convertImagesToCocoImages(images);

    const expectedCocoImage = [
      {
        id: 1,
        // ...
      },
      {
        id: 2,
        // ...
      },
    ];

    const expectedMapping = {
      "id-an-image": 1,
      "id-another-image": 2,
    };

    expect(cocoImages).toMatchObject(expectedCocoImage);
    expect(imageIdsMap).toEqual(expectedMapping);
  });

  test("Should convert a set of images and label classes to a coco dataset", () => {
    const labelClass1 = createLabelClass("label-class-1");
    const labelClass2 = createLabelClass("label-class-2");

    const image1 = createImage("image-1", 1, 2);
    const image2 = createImage("image-2", 1, 2);

    const label1 = createLabel("id-label-1", image1.id, labelClass1.id);
    const label2 = createLabel("id-label-2", image1.id, labelClass2.id);
    const label3 = createLabel("id-label-3", image2.id, labelClass2.id);

    const expectedCocoDataset = {
      ...initialCocoDataset, // default coco dataset
      categories: [
        {
          id: 1,
          // ...
        },
        {
          id: 2,
          // ...
        },
      ],
      images: [
        {
          id: 1,
          // ...
        },
        {
          id: 2,
          // ...
        },
      ],
      annotations: [
        {
          id: 1,
          image_id: 1,
          category_id: 1,
          // ...
        },
        {
          id: 2,
          image_id: 1,
          category_id: 2,
          // ...
        },
        {
          id: 3,
          image_id: 2,
          category_id: 2,
          // ...
        },
      ],
    };

    expect(
      convertLabelflowDatasetToCocoDataset(
        [image1, image2],
        [label1, label2, label3],
        [labelClass1, labelClass2]
      )
    ).toMatchObject(expectedCocoDataset);
  });
});
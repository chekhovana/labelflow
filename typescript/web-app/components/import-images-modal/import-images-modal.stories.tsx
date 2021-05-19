import { Button, useDisclosure } from "@chakra-ui/react";
import { ImportImagesModal } from "./import-images-modal";

export default {
  title: "Import images modal",
};

export const Default = () => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <div>
      <Button onClick={onOpen}>Display</Button>
      <ImportImagesModal
        isOpen={isOpen}
        onClose={onClose}
        onImportSucceed={(acceptedFiles) => console.log(acceptedFiles)}
      />
    </div>
  );
};

import { Button, ModalBody, ModalFooter, ModalHeader, ModalOverlay } from "@cortex/ui";

interface CreateVaultModalProps {
  onClose: () => void;
}

export function CreateVaultModal({ onClose }: CreateVaultModalProps) {
  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader>
        Create a new vault
      </ModalHeader>
      <ModalBody>
        Teste alou
      </ModalBody>
      <ModalFooter>
        <Button variant="danger" onClick={onClose}>Cancel</Button>
      </ModalFooter>
    </ModalOverlay>
  )
}

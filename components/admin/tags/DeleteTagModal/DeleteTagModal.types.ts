export interface DeleteTagModalProps {
  isOpen: boolean;
  tagName: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

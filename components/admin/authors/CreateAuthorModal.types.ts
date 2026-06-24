export interface CreateAuthorModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: string;
}

export interface CreateAuthorFormData {
  name: string;
}

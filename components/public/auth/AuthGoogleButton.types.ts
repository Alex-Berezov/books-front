export interface AuthGoogleButtonProps {
  disabled: boolean;
  /** Вызывается до ухода на Google: форма показывает занятость. */
  onStart: () => void;
  /** Куда вернуться после входа; читается в момент нажатия. */
  getCallbackUrl: () => string;
}

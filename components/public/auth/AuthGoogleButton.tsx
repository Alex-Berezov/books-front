'use client';

import type { FC } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/common/Button';
import { GoogleIcon } from '@/components/common/icons/GoogleIcon';
import { markLoggedIn } from '@/lib/auth/sessionMarker';
import type { AuthGoogleButtonProps } from './AuthGoogleButton.types';

/** Вход через Google - общий для страниц входа и регистрации. */
export const AuthGoogleButton: FC<AuthGoogleButtonProps> = ({
  disabled,
  onStart,
  getCallbackUrl,
}) => (
  <Button
    variant="secondary"
    fullWidth
    leftIcon={<GoogleIcon />}
    onClick={() => {
      onStart();
      // Отметку ставим до ухода на Google: вернётся браузер уже на
      // `callbackUrl`, и этот код не выполнится (LEGACY-075).
      markLoggedIn();
      signIn('google', { callbackUrl: getCallbackUrl() });
    }}
    disabled={disabled}
  >
    Google
  </Button>
);

/**
 * Sign In Client Component
 *
 * Authorization form with email and password.
 * Uses NextAuth signIn for authentication via Credentials provider.
 */

'use client';

import type { FC } from 'react';
import { useState } from 'react';
import { Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/common/Button';
import { GoogleIcon } from '@/components/common/icons/GoogleIcon';
import {
  AuthAlert,
  AuthField,
  AuthLayout,
  validateEmail,
  useAuthForm,
  type AuthFormValues,
} from '@/components/public/auth';
import { authErrorDictKey } from '@/lib/auth/constants';
import { markLoggedIn } from '@/lib/auth/sessionMarker';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './sign-in.module.scss';

type SignInField = 'email' | 'password';
type SignInFormValues = AuthFormValues<SignInField>;

const SIGN_IN_FIELDS: readonly SignInField[] = ['email', 'password'];
const SIGN_IN_INITIAL: SignInFormValues = { email: '', password: '' };

/**
 * Sign In page component
 */
const SignInClient: FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { t } = useTranslation();
  const lang = (params?.lang as string) || 'en';

  // Default redirect path based on lang
  const callbackUrl = searchParams.get('callbackUrl') || `/${lang}`;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Правила полей — те же, что стояли в `rules` у `Form.Item` antd.
   */
  const validateField = (field: SignInField, current: SignInFormValues): string | undefined => {
    if (field === 'email') {
      return validateEmail(current.email, {
        required: t('auth.signin.emailRequired'),
        invalid: t('auth.signin.emailInvalid'),
      });
    }
    if (!current.password) return t('auth.signin.passwordRequired');
    return undefined;
  };

  /**
   * Текст отказа по коду, который вернул `signIn`.
   *
   * Раньше здесь сравнивались английские фразы из `AUTH_ERROR_MESSAGES` — те же
   * строки, что `authorize` бросал наружу (`LEGACY-053`). Теперь наружу идёт код.
   */
  const translateAuthError = (code: string | undefined): string => t(authErrorDictKey(code));

  /**
   * Form submission handler
   */
  const handleSubmit = async (submitted: SignInFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signIn('credentials', {
        redirect: false,
        email: submitted.email,
        password: submitted.password,
        callbackUrl,
      });

      if (result?.error) {
        // Код отказа приходит полем `code` — `error` несёт только тип ошибки
        // самого `next-auth` и причину входа не различает (`LEGACY-053`).
        setError(translateAuthError(result.code));
      } else if (result?.ok) {
        // Successful authentication - set marker and redirect
        markLoggedIn();
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      console.error('Sign-in failed:', err);
      setError(t('auth.signin.genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  const form = useAuthForm<SignInField>({
    initial: SIGN_IN_INITIAL,
    fields: SIGN_IN_FIELDS,
    validate: validateField,
    busy: isLoading,
    onValid: (values) => void handleSubmit(values),
  });

  return (
    <AuthLayout lang={lang}>
      <h2 className={styles.title}>{t('auth.signin.title')}</h2>
      <span className={styles.subtitle}>{t('auth.signin.subtitle')}</span>

      {error && (
        <AuthAlert
          title={t('auth.signin.errorTitle')}
          description={error}
          closeLabel={t('a11y.close')}
          onClose={() => setError(null)}
        />
      )}

      <form id="sign-in" onSubmit={form.handleSubmit} autoComplete="off" className={styles.form}>
        <AuthField
          id="sign-in_email"
          name="email"
          label={t('auth.signin.emailLabel')}
          icon={<Mail size="1em" />}
          type="text"
          value={form.values.email}
          error={form.errors.email}
          placeholder="you@example.com"
          autoComplete="email"
          onChange={form.handleChange('email')}
        />

        <AuthField
          id="sign-in_password"
          name="password"
          label={t('auth.signin.passwordLabel')}
          icon={<Lock size="1em" />}
          type="password"
          value={form.values.password}
          error={form.errors.password}
          placeholder="••••••••"
          autoComplete="current-password"
          onChange={form.handleChange('password')}
          toggleLabels={{ show: t('a11y.showPassword'), hide: t('a11y.hidePassword') }}
        />

        <div className={styles.field}>
          <Button
            variant="primary"
            type="submit"
            loading={isLoading}
            fullWidth
            className={styles.submitButton}
          >
            {t('auth.signin.submitBtn')}
          </Button>
        </div>
      </form>

      <div className={styles.divider}>
        <span>{t('auth.signin.or')}</span>
      </div>

      <div className={styles.socialButtons}>
        <Button
          variant="secondary"
          fullWidth
          leftIcon={<GoogleIcon />}
          onClick={() => {
            setIsLoading(true);
            // Отметку ставим до ухода на Google: вернётся браузер уже на
            // `callbackUrl`, и этот код не выполнится (LEGACY-075).
            markLoggedIn();
            signIn('google', { callbackUrl });
          }}
          disabled={isLoading}
        >
          Google
        </Button>
      </div>

      <div className={styles.footer}>
        {t('auth.signin.noAccount')}{' '}
        <Link href={`/${lang}/auth/register`}>{t('auth.signin.createOne')}</Link>
      </div>
    </AuthLayout>
  );
};

export default SignInClient;

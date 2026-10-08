/**
 * Register Client Component
 *
 * Registration form with email and password.
 * Registers user via API and redirects to sign-in page.
 */

'use client';

import type { FC } from 'react';
import { useState } from 'react';
import { CircleCheck, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
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
import { markLoggedIn } from '@/lib/auth/sessionMarker';
import { publicErrorKey } from '@/lib/errors';
import { httpPost } from '@/lib/http';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { logError } from '@/lib/utils/log-error';
import type { AuthResponse } from '@/types/api-schema';
import styles from './register.module.scss';

type RegisterField = 'email' | 'password' | 'confirmPassword';
type RegisterFormValues = AuthFormValues<RegisterField>;

const REGISTER_FIELDS: readonly RegisterField[] = ['email', 'password', 'confirmPassword'];
const REGISTER_INITIAL: RegisterFormValues = { email: '', password: '', confirmPassword: '' };

/** Смена пароля перепроверяет подтверждение, если его уже трогали. */
const REGISTER_DEPENDENTS = { password: ['confirmPassword'] } as const;

/**
 * Восемь, как требует бэкенд (`@MinLength(8)` на `password`):
 * при шести форма пропускала пароль, который сервер отбивал 400.
 */
const PASSWORD_MIN_LENGTH = 8;

/**
 * Register page component
 */
const RegisterClient: FC = () => {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const lang = (params?.lang as string) || 'en';
  const callbackUrl = `/${lang}`;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  /** Правила полей — те же, что стояли в `rules` у `Form.Item` antd. */
  const validateField = (field: RegisterField, current: RegisterFormValues): string | undefined => {
    if (field === 'email') {
      return validateEmail(current.email, {
        required: t('auth.register.emailRequired'),
        invalid: t('auth.register.emailInvalid'),
      });
    }
    if (field === 'password') {
      if (!current.password) return t('auth.register.passwordRequired');
      // Длина в символах, а не в кодовых единицах UTF-16 — так считал валидатор antd.
      if (Array.from(current.password).length < PASSWORD_MIN_LENGTH) {
        return t('auth.register.passwordLength');
      }
      return undefined;
    }
    if (!current.confirmPassword) return t('auth.register.confirmRequired');
    if (current.password !== current.confirmPassword) return t('auth.register.confirmMatch');
    return undefined;
  };

  /**
   * Form submission handler
   */
  const handleSubmit = async (submitted: RegisterFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      // Call backend auth register
      await httpPost<AuthResponse>('/auth/register', {
        email: submitted.email,
        password: submitted.password,
      });

      setIsSuccess(true);
    } catch (err: unknown) {
      // 🔴 `err.message` посетителю не показываем: и текст бэкенда, и запасная фраза
      // транспорта — английские, а страница публичная (`LEGACY-053`). Известные коды
      // разводим по словарю, остальное — общий текст; подробности уходят в консоль.
      logError('auth.register', err);
      setError(
        t(
          publicErrorKey(err, {
            fallback: 'auth.register.genericError',
            conflict: 'auth.register.emailTaken',
            rateLimit: 'auth.register.rateLimit',
            validation: 'auth.register.checkFields',
          })
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const form = useAuthForm<RegisterField>({
    initial: REGISTER_INITIAL,
    fields: REGISTER_FIELDS,
    validate: validateField,
    dependents: REGISTER_DEPENDENTS,
    busy: isLoading,
    onValid: (values) => void handleSubmit(values),
  });

  const toggleLabels = { show: t('a11y.showPassword'), hide: t('a11y.hidePassword') };

  if (isSuccess) {
    return (
      <AuthLayout lang={lang}>
        <div className={styles.successScreen}>
          <CircleCheck className={styles.successIcon} size="1em" />
          <h2 className={styles.successTitle}>{t('auth.register.successTitle')}</h2>
          <span className={styles.successText}>{t('auth.register.successText')}</span>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => router.push(`/${lang}/auth/sign-in`)}
          >
            {t('auth.register.successBtn')}
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout lang={lang}>
      <h2 className={styles.title}>{t('auth.register.title')}</h2>
      <span className={styles.subtitle}>{t('auth.register.subtitle')}</span>

      {error && (
        <AuthAlert
          title={t('auth.register.errorTitle')}
          description={error}
          closeLabel={t('a11y.close')}
          onClose={() => setError(null)}
        />
      )}

      <form id="register" onSubmit={form.handleSubmit} autoComplete="off" className={styles.form}>
        <AuthField
          id="register_email"
          name="email"
          label={t('auth.register.emailLabel')}
          icon={<Mail size="1em" />}
          type="text"
          value={form.values.email}
          error={form.errors.email}
          placeholder="you@example.com"
          autoComplete="email"
          onChange={form.handleChange('email')}
        />

        <AuthField
          id="register_password"
          name="password"
          label={t('auth.register.passwordLabel')}
          icon={<Lock size="1em" />}
          type="password"
          value={form.values.password}
          error={form.errors.password}
          placeholder={t('auth.register.passwordPlaceholder')}
          autoComplete="new-password"
          onChange={form.handleChange('password')}
          toggleLabels={toggleLabels}
        />

        <AuthField
          id="register_confirmPassword"
          name="confirmPassword"
          label={t('auth.register.confirmLabel')}
          icon={<Lock size="1em" />}
          type="password"
          value={form.values.confirmPassword}
          error={form.errors.confirmPassword}
          placeholder={t('auth.register.confirmPlaceholder')}
          autoComplete="new-password"
          onChange={form.handleChange('confirmPassword')}
          toggleLabels={toggleLabels}
        />

        <div className={styles.field}>
          <Button
            variant="primary"
            type="submit"
            loading={isLoading}
            fullWidth
            className={styles.submitButton}
          >
            {t('auth.register.submitBtn')}
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
        {t('auth.register.hasAccount')}{' '}
        <Link href={`/${lang}/auth/sign-in`}>{t('auth.register.signinLink')}</Link>
      </div>
    </AuthLayout>
  );
};

export default RegisterClient;

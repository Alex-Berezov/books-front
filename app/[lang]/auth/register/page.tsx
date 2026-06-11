/**
 * Register Page
 *
 * Registration form with email and password.
 * Registers user via API and redirects to sign-in page.
 */

'use client';

import type { FC } from 'react';
import { useState } from 'react';
import {
  LockOutlined,
  MailOutlined,
  BookOutlined,
  CheckCircleOutlined,
  GoogleOutlined,
} from '@ant-design/icons';
import { Form, Input, Alert, Typography } from 'antd';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/common/Button';
import { httpPost } from '@/lib/http';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './register.module.scss';

const { Title, Text } = Typography;

interface RegisterFormValues {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Register page component
 */
const RegisterPage: FC = () => {
  const router = useRouter();
  const params = useParams();
  const { t } = useTranslation();
  const lang = (params?.lang as string) || 'en';
  const callbackUrl = `/${lang}`;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  /**
   * Form submission handler
   */
  const handleSubmit = async (values: RegisterFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      // Call backend auth register
      await httpPost('/auth/register', {
        email: values.email,
        password: values.password,
      });

      setIsSuccess(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create account';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Sidebar - Brand Identity */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarContent}>
          <div className={styles.brand}>
            <BookOutlined className={styles.logoIcon} />
            <span className={styles.brandName}>BIBLIARIS</span>
          </div>
          <p className={styles.tagline}>{t('auth.sidebar.tagline')}</p>
          <div className={styles.featuresList}>
            {[
              t('auth.sidebar.feat1'),
              t('auth.sidebar.feat2'),
              t('auth.sidebar.feat3'),
              t('auth.sidebar.feat4'),
            ].map((feat) => (
              <div key={feat} className={styles.featureItem}>
                <CheckCircleOutlined className={styles.checkIcon} />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Form Section */}
      <div className={styles.formSection}>
        <div className={styles.formWrapper}>
          {/* Mobile Header */}
          <div className={styles.mobileHeader}>
            <BookOutlined className={styles.logoIcon} />
            <span className={styles.brandName}>BIBLIARIS</span>
          </div>

          {isSuccess ? (
            <div className={styles.successScreen}>
              <CheckCircleOutlined className={styles.successIcon} />
              <Title level={2} className={styles.successTitle}>
                {t('auth.register.successTitle')}
              </Title>
              <Text className={styles.successText}>{t('auth.register.successText')}</Text>
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => router.push(`/${lang}/auth/sign-in`)}
              >
                {t('auth.register.successBtn')}
              </Button>
            </div>
          ) : (
            <>
              <Title level={2} className={styles.title}>
                {t('auth.register.title')}
              </Title>
              <Text className={styles.subtitle}>{t('auth.register.subtitle')}</Text>

              {error && (
                <Alert
                  message={t('auth.register.errorTitle')}
                  description={error}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setError(null)}
                  className={styles.alert}
                />
              )}

              <Form
                name="register"
                onFinish={handleSubmit}
                autoComplete="off"
                layout="vertical"
                size="large"
                className={styles.form}
              >
                <Form.Item
                  name="email"
                  label={t('auth.register.emailLabel')}
                  rules={[
                    { required: true, message: t('auth.register.emailRequired') },
                    { type: 'email', message: t('auth.register.emailInvalid') },
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={t('auth.register.passwordLabel')}
                  rules={[
                    { required: true, message: t('auth.register.passwordRequired') },
                    { min: 6, message: t('auth.register.passwordLength') },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                  />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  label={t('auth.register.confirmLabel')}
                  dependencies={['password']}
                  rules={[
                    { required: true, message: t('auth.register.confirmRequired') },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error(t('auth.register.confirmMatch')));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                  />
                </Form.Item>

                <Form.Item>
                  <Button variant="primary" type="submit" loading={isLoading} fullWidth>
                    {t('auth.register.submitBtn')}
                  </Button>
                </Form.Item>
              </Form>

              <div className={styles.divider}>
                <span>{t('auth.signin.or')}</span>
              </div>

              <div
                className={styles.socialButtons}
                style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}
              >
                <Button
                  variant="secondary"
                  fullWidth
                  leftIcon={<GoogleOutlined style={{ color: '#ea4335' }} />}
                  onClick={() => {
                    setIsLoading(true);
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

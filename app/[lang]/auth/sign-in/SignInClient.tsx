/**
 * Sign In Client Component
 *
 * Authorization form with email and password.
 * Uses NextAuth signIn for authentication via Credentials provider.
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
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/common/Button';
import { useTranslation } from '@/lib/i18n/useTranslation';
import styles from './sign-in.module.scss';

const { Title, Text } = Typography;

interface SignInFormValues {
  email: string;
  password: string;
}

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
   * Form submission handler
   */
  const handleSubmit = async (values: SignInFormValues) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await signIn('credentials', {
        redirect: false,
        email: values.email,
        password: values.password,
        callbackUrl,
      });

      if (result?.error) {
        // Handle NextAuth errors
        setError(result.error);
      } else if (result?.ok) {
        // Successful authentication - redirect
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
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

          <Title level={2} className={styles.title}>
            {t('auth.signin.title')}
          </Title>
          <Text className={styles.subtitle}>{t('auth.signin.subtitle')}</Text>

          {error && (
            <Alert
              message={t('auth.signin.errorTitle')}
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              className={styles.alert}
            />
          )}

          <Form
            name="sign-in"
            onFinish={handleSubmit}
            autoComplete="off"
            layout="vertical"
            size="large"
            className={styles.form}
          >
            <Form.Item
              name="email"
              label={t('auth.signin.emailLabel')}
              rules={[
                { required: true, message: t('auth.signin.emailRequired') },
                { type: 'email', message: t('auth.signin.emailInvalid') },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="you@example.com" autoComplete="email" />
            </Form.Item>

            <Form.Item
              name="password"
              label={t('auth.signin.passwordLabel')}
              rules={[{ required: true, message: t('auth.signin.passwordRequired') }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item>
              <Button variant="primary" type="submit" loading={isLoading} fullWidth>
                {t('auth.signin.submitBtn')}
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
            {t('auth.signin.noAccount')}{' '}
            <Link href={`/${lang}/auth/register`}>{t('auth.signin.createOne')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInClient;

/**
 * Sign In Page
 *
 * Authorization form with email and password.
 * Uses NextAuth signIn for authentication via Credentials provider.
 */

'use client';

import type { FC } from 'react';
import { useState } from 'react';
import { LockOutlined, MailOutlined, BookOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Form, Input, Button, Alert, Typography } from 'antd';
import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import styles from './sign-in.module.scss';

const { Title, Text } = Typography;

interface SignInFormValues {
  email: string;
  password: string;
}

/**
 * Sign In page component
 */
const SignInPage: FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
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
          <p className={styles.tagline}>
            Your digital library awaits. Thousands of books and audiobooks at your fingertips.
          </p>
          <div className={styles.featuresList}>
            {[
              'Access thousands of books instantly',
              'Listen to audiobooks anywhere',
              'Track your reading progress',
              'Build your personal bookshelf',
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
            Welcome back
          </Title>
          <Text className={styles.subtitle}>Sign in to your account to continue reading</Text>

          {error && (
            <Alert
              message="Authentication Error"
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
              label="Email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="you@example.com" autoComplete="email" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={isLoading} block>
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <div className={styles.footer}>
            Don&apos;t have an account? <Link href={`/${lang}/auth/register`}>Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
